const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Create a new PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'kchat_inventory',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Initialize tables
async function initDatabase() {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Create inventory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        validation_date TIMESTAMP,
        source VARCHAR(255),
        category VARCHAR(255),
        tags TEXT[],
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_id VARCHAR(255),
        validity_checked BOOLEAN DEFAULT FALSE,
        validity_score FLOAT
      )
    `);
    
    // Create validity checks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS validity_checks (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory(id),
        check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        result VARCHAR(50),
        score FLOAT,
        check_method VARCHAR(255),
        details JSONB,
        execution_time INTEGER
      )
    `);
    
    // Create inventory stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_stats (
        product_id VARCHAR(255) PRIMARY KEY,
        total_items INTEGER DEFAULT 0,
        available_items INTEGER DEFAULT 0,
        sold_items INTEGER DEFAULT 0,
        valid_items INTEGER DEFAULT 0,
        invalid_items INTEGER DEFAULT 0,
        unchecked_items INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create webhook events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        payload JSONB,
        processed BOOLEAN DEFAULT FALSE,
        processing_result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_validity ON inventory(validity_checked, validity_score)');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('PostgreSQL database initialized successfully');
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error initializing PostgreSQL database:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Add inventory items
async function addInventoryItems(productId, items, source = 'manual', category = 'general', tags = []) {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Insert each item
    for (const content of items) {
      await client.query(
        'INSERT INTO inventory (product_id, content, source, category, tags) VALUES ($1, $2, $3, $4, $5)',
        [productId, content, source, category, tags]
      );
    }
    
    // Update inventory stats
    await updateInventoryStats(client, productId);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return { success: true, added: items.length };
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error adding inventory items:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Get available inventory items
async function getAvailableItems(productId, limit = 1) {
  try {
    const result = await pool.query(
      'SELECT id, content FROM inventory WHERE product_id = $1 AND status = $2 ORDER BY id LIMIT $3',
      [productId, 'available', limit]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error getting available inventory items:', err);
    throw err;
  }
}

// Reserve inventory items for an order
async function reserveItems(productId, orderId, quantity = 1) {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get available items
    const result = await client.query(
      'SELECT id, content FROM inventory WHERE product_id = $1 AND status = $2 ORDER BY id LIMIT $3',
      [productId, 'available', quantity]
    );
    
    if (result.rows.length < quantity) {
      throw new Error(`Not enough inventory available for product ${productId}`);
    }
    
    // Reserve items by updating their status
    const itemIds = result.rows.map(row => row.id);
    await client.query(
      'UPDATE inventory SET status = $1, order_id = $2, updated_date = CURRENT_TIMESTAMP WHERE id = ANY($3)',
      ['reserved', orderId, itemIds]
    );
    
    // Update inventory stats
    await updateInventoryStats(client, productId);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return result.rows;
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error reserving inventory items:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Complete order and mark items as sold
async function completeOrder(orderId) {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get reserved items for this order
    const result = await client.query(
      'SELECT id, product_id FROM inventory WHERE order_id = $1 AND status = $2',
      [orderId, 'reserved']
    );
    
    if (result.rows.length === 0) {
      throw new Error(`No reserved items found for order ${orderId}`);
    }
    
    // Mark items as sold
    const itemIds = result.rows.map(row => row.id);
    await client.query(
      'UPDATE inventory SET status = $1, updated_date = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      ['sold', itemIds]
    );
    
    // Get unique product IDs to update stats
    const productIds = [...new Set(result.rows.map(row => row.product_id))];
    
    // Update inventory stats for each product
    for (const productId of productIds) {
      await updateInventoryStats(client, productId);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    return { success: true, sold: itemIds.length };
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error completing order:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Cancel order and return items to available status
async function cancelOrder(orderId) {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get reserved items for this order
    const result = await client.query(
      'SELECT id, product_id FROM inventory WHERE order_id = $1 AND status = $2',
      [orderId, 'reserved']
    );
    
    if (result.rows.length === 0) {
      throw new Error(`No reserved items found for order ${orderId}`);
    }
    
    // Return items to available status
    const itemIds = result.rows.map(row => row.id);
    await client.query(
      'UPDATE inventory SET status = $1, order_id = NULL, updated_date = CURRENT_TIMESTAMP WHERE id = ANY($2)',
      ['available', itemIds]
    );
    
    // Get unique product IDs to update stats
    const productIds = [...new Set(result.rows.map(row => row.product_id))];
    
    // Update inventory stats for each product
    for (const productId of productIds) {
      await updateInventoryStats(client, productId);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    return { success: true, returned: itemIds.length };
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error canceling order:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Update inventory stats for a product
async function updateInventoryStats(client, productId) {
  // Count items by status
  const stats = await client.query(
    `SELECT 
      COUNT(*) as total_items,
      COUNT(*) FILTER (WHERE status = 'available') as available_items,
      COUNT(*) FILTER (WHERE status = 'sold') as sold_items,
      COUNT(*) FILTER (WHERE validity_checked = true AND validity_score >= 0.8) as valid_items,
      COUNT(*) FILTER (WHERE validity_checked = true AND validity_score < 0.8) as invalid_items,
      COUNT(*) FILTER (WHERE validity_checked = false) as unchecked_items
    FROM inventory 
    WHERE product_id = $1`,
    [productId]
  );
  
  if (stats.rows.length === 0) {
    return false;
  }
  
  const {
    total_items,
    available_items,
    sold_items,
    valid_items,
    invalid_items,
    unchecked_items
  } = stats.rows[0];
  
  // Update inventory stats table using upsert pattern
  await client.query(
    `INSERT INTO inventory_stats 
      (product_id, total_items, available_items, sold_items, valid_items, invalid_items, unchecked_items, last_updated) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
    ON CONFLICT (product_id) DO UPDATE SET 
      total_items = $2,
      available_items = $3,
      sold_items = $4,
      valid_items = $5,
      invalid_items = $6,
      unchecked_items = $7,
      last_updated = CURRENT_TIMESTAMP`,
    [productId, total_items, available_items, sold_items, valid_items, invalid_items, unchecked_items]
  );
  
  return true;
}

// Get inventory stats for a product
async function getInventoryStats(productId) {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory_stats WHERE product_id = $1',
      [productId]
    );
    
    if (result.rows.length === 0) {
      // No stats yet, return zeros
      return {
        total_items: 0,
        available_items: 0,
        sold_items: 0,
        valid_items: 0,
        invalid_items: 0,
        unchecked_items: 0,
        last_updated: new Date()
      };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error getting inventory stats:', err);
    throw err;
  }
}

// Add validity check result
async function addValidityCheck(inventoryId, result, score, method, details = {}, executionTime = 0) {
  // Get a client from the connection pool
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Get the inventory item to find its product ID
    const inventoryResult = await client.query(
      'SELECT product_id FROM inventory WHERE id = $1',
      [inventoryId]
    );
    
    if (inventoryResult.rows.length === 0) {
      throw new Error(`Inventory item ${inventoryId} not found`);
    }
    
    const { product_id } = inventoryResult.rows[0];
    
    // Add validity check
    await client.query(
      'INSERT INTO validity_checks (inventory_id, result, score, check_method, details, execution_time) VALUES ($1, $2, $3, $4, $5, $6)',
      [inventoryId, result, score, method, details, executionTime]
    );
    
    // Update inventory item with validity result
    await client.query(
      'UPDATE inventory SET validity_checked = true, validity_score = $1, validation_date = CURRENT_TIMESTAMP, updated_date = CURRENT_TIMESTAMP WHERE id = $2',
      [score, inventoryId]
    );
    
    // Update inventory stats
    await updateInventoryStats(client, product_id);
    
    // Commit transaction
    await client.query('COMMIT');
    
    return { success: true };
  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error adding validity check:', err);
    throw err;
  } finally {
    // Release client back to the pool
    client.release();
  }
}

// Record a webhook event
async function recordWebhookEvent(eventType, payload) {
  try {
    const result = await pool.query(
      'INSERT INTO webhook_events (event_type, payload) VALUES ($1, $2) RETURNING id',
      [eventType, payload]
    );
    
    return result.rows[0].id;
  } catch (err) {
    console.error('Error recording webhook event:', err);
    throw err;
  }
}

// Mark webhook event as processed
async function markWebhookProcessed(eventId, processingResult) {
  try {
    await pool.query(
      'UPDATE webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP, processing_result = $1 WHERE id = $2',
      [processingResult, eventId]
    );
    
    return { success: true };
  } catch (err) {
    console.error('Error marking webhook event as processed:', err);
    throw err;
  }
}

// Get unprocessed webhook events
async function getUnprocessedWebhookEvents(limit = 100) {
  try {
    const result = await pool.query(
      'SELECT * FROM webhook_events WHERE processed = false ORDER BY created_at LIMIT $1',
      [limit]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error getting unprocessed webhook events:', err);
    throw err;
  }
}

// Check if a product needs restocking
async function checkRestockNeeded(productId, threshold = 10) {
  try {
    const stats = await getInventoryStats(productId);
    
    // If available items are less than threshold, restock is needed
    return {
      needsRestock: stats.available_items < threshold,
      currentStock: stats.available_items,
      threshold
    };
  } catch (err) {
    console.error('Error checking if restock is needed:', err);
    throw err;
  }
}

// Get low stock products
async function getLowStockProducts(threshold = 10) {
  try {
    const result = await pool.query(
      'SELECT product_id, available_items FROM inventory_stats WHERE available_items < $1',
      [threshold]
    );
    
    return result.rows;
  } catch (err) {
    console.error('Error getting low stock products:', err);
    throw err;
  }
}

module.exports = {
  initDatabase,
  addInventoryItems,
  getAvailableItems,
  reserveItems,
  completeOrder,
  cancelOrder,
  getInventoryStats,
  addValidityCheck,
  recordWebhookEvent,
  markWebhookProcessed,
  getUnprocessedWebhookEvents,
  checkRestockNeeded,
  getLowStockProducts
};