const axios = require('axios');
const crypto = require('crypto');
const pgDb = require('../db/postgres');
const dotenv = require('dotenv');

dotenv.config();

// OpenBullet2 API configuration
const apiBaseUrl = process.env.OPENBULLET_API_URL || 'http://localhost:5000/api';
const apiKey = process.env.OPENBULLET_API_KEY;
const webhookSecret = process.env.OPENBULLET_WEBHOOK_SECRET;

// Configure axios instance
const obApi = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey
  },
  timeout: 30000 // 30 seconds timeout
});

/**
 * Verify webhook signature
 * @param {string} signature - Webhook signature from header
 * @param {Object} payload - Webhook payload
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhookSignature(signature, payload) {
  if (!webhookSecret) {
    console.warn('Webhook secret not configured, skipping signature verification');
    return true;
  }
  
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const calculatedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(signature)
  );
}

/**
 * Get the status of OpenBullet2 API
 * @returns {Promise<Object>} - API status
 */
async function getApiStatus() {
  try {
    const response = await obApi.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error getting OpenBullet2 API status:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Create a new job in OpenBullet2
 * @param {string} jobName - Name of the job
 * @param {string} configId - ID of the config to use
 * @param {string} wordlistPath - Path to the wordlist
 * @param {Object} options - Job options
 * @returns {Promise<Object>} - Created job
 */
async function createJob(jobName, configId, wordlistPath, options = {}) {
  try {
    const payload = {
      name: jobName,
      configId,
      wordlistPath,
      ...options
    };
    
    const response = await obApi.post('/jobs', payload);
    return response.data;
  } catch (error) {
    console.error('Error creating OpenBullet2 job:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Start a job in OpenBullet2
 * @param {string} jobId - ID of the job
 * @returns {Promise<Object>} - Job status
 */
async function startJob(jobId) {
  try {
    const response = await obApi.post(`/jobs/${jobId}/start`);
    return response.data;
  } catch (error) {
    console.error('Error starting OpenBullet2 job:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Stop a job in OpenBullet2
 * @param {string} jobId - ID of the job
 * @returns {Promise<Object>} - Job status
 */
async function stopJob(jobId) {
  try {
    const response = await obApi.post(`/jobs/${jobId}/stop`);
    return response.data;
  } catch (error) {
    console.error('Error stopping OpenBullet2 job:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Get job status in OpenBullet2
 * @param {string} jobId - ID of the job
 * @returns {Promise<Object>} - Job status
 */
async function getJobStatus(jobId) {
  try {
    const response = await obApi.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting OpenBullet2 job status:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Get job hits in OpenBullet2
 * @param {string} jobId - ID of the job
 * @returns {Promise<Array>} - Job hits
 */
async function getJobHits(jobId) {
  try {
    const response = await obApi.get(`/jobs/${jobId}/hits`);
    return response.data;
  } catch (error) {
    console.error('Error getting OpenBullet2 job hits:', error.message);
    throw new Error(`OpenBullet2 API error: ${error.message}`);
  }
}

/**
 * Process OpenBullet2 webhook event
 * @param {Object} event - Webhook event
 * @returns {Promise<Object>} - Processing result
 */
async function processWebhookEvent(event) {
  try {
    // Record webhook event in database
    const eventId = await pgDb.recordWebhookEvent(event.type, event);
    
    let processingResult = { success: false };
    
    // Process different event types
    switch (event.type) {
      case 'job.completed':
        processingResult = await processJobCompletedEvent(event);
        break;
      case 'job.hit':
        processingResult = await processJobHitEvent(event);
        break;
      case 'job.progress':
        processingResult = await processJobProgressEvent(event);
        break;
      default:
        processingResult = { success: false, message: `Unknown event type: ${event.type}` };
    }
    
    // Mark webhook event as processed
    await pgDb.markWebhookProcessed(eventId, processingResult);
    
    return processingResult;
  } catch (error) {
    console.error('Error processing webhook event:', error.message);
    throw new Error(`Webhook processing error: ${error.message}`);
  }
}

/**
 * Process job completed event
 * @param {Object} event - Webhook event
 * @returns {Promise<Object>} - Processing result
 */
async function processJobCompletedEvent(event) {
  try {
    // Get job details
    const jobId = event.jobId;
    const job = await getJobStatus(jobId);
    
    // Get job hits
    const hits = await getJobHits(jobId);
    
    // Process hits as inventory items
    if (hits && hits.length > 0) {
      // Map job metadata to get product ID
      const productId = job.metadata?.productId || 'default';
      
      // Extract content from hits
      const items = hits.map(hit => hit.data.SUCCESS || hit.data.DATA || hit.capturedData);
      
      // Add items to inventory
      await pgDb.addInventoryItems(productId, items, 'openbullet', job.metadata?.category || 'general', job.metadata?.tags || []);
      
      return {
        success: true,
        message: `Processed ${items.length} hits from job ${jobId}`,
        itemsAdded: items.length
      };
    }
    
    return {
      success: true,
      message: `Job ${jobId} completed with 0 hits`,
      itemsAdded: 0
    };
  } catch (error) {
    console.error('Error processing job completed event:', error.message);
    return {
      success: false,
      message: `Error processing job completed event: ${error.message}`
    };
  }
}

/**
 * Process job hit event
 * @param {Object} event - Webhook event
 * @returns {Promise<Object>} - Processing result
 */
async function processJobHitEvent(event) {
  try {
    // Extract hit data
    const hitData = event.hit;
    const jobId = event.jobId;
    
    // Get job details
    const job = await getJobStatus(jobId);
    
    // Extract content from hit
    const content = hitData.data.SUCCESS || hitData.data.DATA || hitData.capturedData;
    
    if (content) {
      // Map job metadata to get product ID
      const productId = job.metadata?.productId || 'default';
      
      // Add item to inventory
      await pgDb.addInventoryItems(productId, [content], 'openbullet', job.metadata?.category || 'general', job.metadata?.tags || []);
      
      return {
        success: true,
        message: `Processed hit from job ${jobId}`,
        itemsAdded: 1
      };
    }
    
    return {
      success: false,
      message: `Hit from job ${jobId} has no valid content`,
      itemsAdded: 0
    };
  } catch (error) {
    console.error('Error processing job hit event:', error.message);
    return {
      success: false,
      message: `Error processing job hit event: ${error.message}`
    };
  }
}

/**
 * Process job progress event
 * @param {Object} event - Webhook event
 * @returns {Promise<Object>} - Processing result
 */
async function processJobProgressEvent(event) {
  // Just log progress events
  console.log(`Job ${event.jobId} progress: ${event.progress}%`);
  
  return {
    success: true,
    message: `Logged progress for job ${event.jobId}`
  };
}

/**
 * Create and start a job to validate items
 * @param {string} productId - Product ID
 * @param {string} configId - OpenBullet2 config ID for validation
 * @returns {Promise<Object>} - Job status
 */
async function validateItems(productId, configId) {
  try {
    // Get items to validate
    const stats = await pgDb.getInventoryStats(productId);
    
    if (stats.unchecked_items === 0) {
      return {
        success: false,
        message: `No unchecked items for product ${productId}`
      };
    }
    
    // Create a job name
    const jobName = `Validate_${productId}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    
    // Create a job
    const job = await createJob(jobName, configId, null, {
      metadata: {
        type: 'validation',
        productId,
        timestamp: new Date().toISOString()
      }
    });
    
    // Start the job
    await startJob(job.id);
    
    return {
      success: true,
      message: `Started validation job ${job.id} for product ${productId}`,
      jobId: job.id
    };
  } catch (error) {
    console.error('Error validating items:', error.message);
    return {
      success: false,
      message: `Error validating items: ${error.message}`
    };
  }
}

/**
 * Create and start a job to get new inventory items
 * @param {string} productId - Product ID
 * @param {string} configId - OpenBullet2 config ID for scraping
 * @param {number} targetCount - Number of items to collect
 * @returns {Promise<Object>} - Job status
 */
async function getNewInventory(productId, configId, targetCount = 100) {
  try {
    // Create a job name
    const jobName = `Collect_${productId}_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    
    // Create a job
    const job = await createJob(jobName, configId, null, {
      metadata: {
        type: 'collection',
        productId,
        targetCount,
        timestamp: new Date().toISOString()
      }
    });
    
    // Start the job
    await startJob(job.id);
    
    return {
      success: true,
      message: `Started collection job ${job.id} for product ${productId}`,
      jobId: job.id
    };
  } catch (error) {
    console.error('Error getting new inventory:', error.message);
    return {
      success: false,
      message: `Error getting new inventory: ${error.message}`
    };
  }
}

/**
 * Check if products need restocking and start collection jobs if needed
 * @param {number} threshold - Stock threshold to trigger restock
 * @param {Object} configMap - Map of product IDs to config IDs
 * @returns {Promise<Object>} - Restock results
 */
async function checkAndRestockProducts(threshold = 10, configMap = {}) {
  try {
    // Get low stock products
    const lowStockProducts = await pgDb.getLowStockProducts(threshold);
    
    if (lowStockProducts.length === 0) {
      return {
        success: true,
        message: 'No products need restocking',
        restockStarted: []
      };
    }
    
    const restockResults = [];
    
    // Try to restock each low stock product
    for (const product of lowStockProducts) {
      const productId = product.product_id;
      const currentStock = product.available_items;
      const configId = configMap[productId];
      
      if (!configId) {
        console.warn(`No config ID found for product ${productId}`);
        restockResults.push({
          productId,
          success: false,
          message: 'No config ID found for this product'
        });
        continue;
      }
      
      // Calculate how many items to collect
      const targetCount = Math.max(100, threshold * 2 - currentStock);
      
      // Start collection job
      const result = await getNewInventory(productId, configId, targetCount);
      
      restockResults.push({
        productId,
        success: result.success,
        message: result.message,
        jobId: result.jobId,
        targetCount
      });
    }
    
    return {
      success: true,
      message: `Checked ${lowStockProducts.length} products for restocking`,
      restockStarted: restockResults
    };
  } catch (error) {
    console.error('Error checking and restocking products:', error.message);
    return {
      success: false,
      message: `Error checking and restocking products: ${error.message}`
    };
  }
}

module.exports = {
  verifyWebhookSignature,
  getApiStatus,
  createJob,
  startJob,
  stopJob,
  getJobStatus,
  getJobHits,
  processWebhookEvent,
  validateItems,
  getNewInventory,
  checkAndRestockProducts
};