const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Stock = require('../../models/Stock');
const Wallet = require('../../models/Wallet');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} - Created product
 */
async function createProduct(productData) {
  try {
    const product = new Product(productData);
    await product.save();
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Get products with filtering options
 * @param {Object} filters - Filter options
 * @returns {Promise<Array<Object>>} - List of products
 */
async function getProducts(filters = {}) {
  try {
    const query = { active: true };
    
    // Apply filters
    if (filters.category) query.category = filters.category;
    if (filters.subcategory) query.subcategory = filters.subcategory;
    if (filters.seller) query.seller = filters.seller;
    if (filters.type) query.type = filters.type;
    if (filters.featured !== undefined) query.featured = filters.featured;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Apply sorting
    let sort = {};
    if (filters.sort) {
      switch (filters.sort) {
        case 'price_asc':
          sort = { price: 1 };
          break;
        case 'price_desc':
          sort = { price: -1 };
          break;
        case 'newest':
          sort = { date: -1 };
          break;
        case 'oldest':
          sort = { date: 1 };
          break;
        case 'bestselling':
          sort = { soldCount: -1 };
          break;
        default:
          sort = { date: -1 };
      }
    } else {
      // Default sort: featured first, then newest
      sort = { featured: -1, date: -1 };
    }
    
    // Apply pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('seller', 'name email');
    
    // Get total count for pagination
    const total = await Product.countDocuments(query);
    
    return {
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * Add stock to a product
 * @param {string} productId - Product ID
 * @param {string} content - Stock content
 * @param {number} quantity - Number of items to add
 * @returns {Promise<Array<Object>>} - Added stock items
 */
async function addStock(productId, content, quantity = 1) {
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    const stockItems = [];
    
    // If content is a string with multiple lines, split it
    const items = content.trim().split(/\r?\n/);
    
    for (const item of items) {
      if (!item.trim()) continue; // Skip empty lines
      
      const stock = new Stock({
        product: productId,
        content: item.trim(),
        used: false
      });
      
      await stock.save();
      stockItems.push(stock);
    }
    
    // Update product stock count
    product.stock = await Stock.countDocuments({ product: productId, used: false });
    await product.save();
    
    return stockItems;
  } catch (error) {
    console.error('Error adding stock:', error);
    throw error;
  }
}

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} - Created order
 */
async function createOrder(orderData) {
  try {
    // Create the order
    const order = new Order(orderData);
    
    // Check if product has enough stock
    const product = await Product.findById(order.product);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.stock !== -1 && product.stock < order.quantity) {
      throw new Error('Not enough stock available');
    }
    
    await order.save();
    
    // For automatic delivery products, reserve the stock
    if (product.type !== 'service' && product.deliveryType === 'digital') {
      await reserveStock(order._id, product._id, order.quantity);
    }
    
    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Update order status and process delivery if needed
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated order
 */
async function updateOrderStatus(orderId, status) {
  try {
    const order = await Order.findById(orderId).populate('product');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    order.status = status;
    
    // If status is completed, process delivery
    if (status === 'completed' && !order.deliveryData.delivered) {
      await processDelivery(order);
    }
    
    // If status is refunded, return stock to inventory
    if (status === 'refunded' && order.deliveryData.delivered) {
      await returnStock(order._id);
    }
    
    await order.save();
    
    // Update product sales count
    if (status === 'completed') {
      const product = await Product.findById(order.product);
      product.soldCount += order.quantity;
      await product.save();
      
      // Add commission to seller wallet
      await addCommission(order);
    }
    
    return order;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

/**
 * Process payment for an order
 * @param {string} orderId - Order ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Updated order
 */
async function processPayment(orderId, paymentData) {
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update payment information
    order.payment = { ...order.payment, ...paymentData };
    
    // If payment is completed, update order status
    if (paymentData.status === 'completed') {
      order.status = 'completed';
      
      // Process delivery if it's an automatic delivery product
      const product = await Product.findById(order.product);
      if (product.deliveryType === 'digital') {
        await processDelivery(order);
      }
    }
    
    await order.save();
    
    return order;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

/**
 * Reserve stock for an order
 * @param {string} orderId - Order ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to reserve
 * @returns {Promise<Array<Object>>} - Reserved stock items
 */
async function reserveStock(orderId, productId, quantity) {
  try {
    // Find available stock items
    const stockItems = await Stock.find({ product: productId, used: false })
      .limit(quantity);
    
    if (stockItems.length < quantity) {
      throw new Error('Not enough stock available');
    }
    
    // Mark stock items as used and associate with the order
    for (const item of stockItems) {
      item.used = true;
      item.order = orderId;
      await item.save();
    }
    
    // Update product stock count
    const product = await Product.findById(productId);
    product.stock = await Stock.countDocuments({ product: productId, used: false });
    await product.save();
    
    return stockItems;
  } catch (error) {
    console.error('Error reserving stock:', error);
    throw error;
  }
}

/**
 * Return stock to inventory if order is refunded
 * @param {string} orderId - Order ID
 * @returns {Promise<Array<Object>>} - Returned stock items
 */
async function returnStock(orderId) {
  try {
    // Find stock items associated with the order
    const stockItems = await Stock.find({ order: orderId });
    
    // Mark stock items as available again
    for (const item of stockItems) {
      item.used = false;
      item.order = null;
      await item.save();
    }
    
    // Update product stock count
    if (stockItems.length > 0) {
      const productId = stockItems[0].product;
      const product = await Product.findById(productId);
      product.stock = await Stock.countDocuments({ product: productId, used: false });
      await product.save();
    }
    
    return stockItems;
  } catch (error) {
    console.error('Error returning stock:', error);
    throw error;
  }
}

/**
 * Process delivery for an order
 * @param {Object} order - Order object
 * @returns {Promise<Object>} - Updated order
 */
async function processDelivery(order) {
  try {
    const product = await Product.findById(order.product);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Get reserved stock for the order
    const stockItems = await Stock.find({ order: order._id });
    
    let deliveryContent = '';
    
    switch (product.type) {
      case 'account':
      case 'combo':
        // Format stock items according to template
        deliveryContent = stockItems.map(item => item.content).join('\n');
        order.deliveryData.contentType = 'text';
        break;
        
      case 'file':
        // For file delivery, store the file ID
        deliveryContent = product.fileId;
        order.deliveryData.contentType = 'file';
        break;
        
      case 'service':
        // For services, just mark as delivered
        deliveryContent = 'Service purchased';
        order.deliveryData.contentType = 'text';
        break;
        
      default:
        deliveryContent = stockItems.map(item => item.content).join('\n');
        order.deliveryData.contentType = 'text';
    }
    
    // Update delivery information
    order.deliveryData.content = deliveryContent;
    order.deliveryData.delivered = true;
    order.deliveryData.deliveredAt = new Date();
    
    await order.save();
    
    return order;
  } catch (error) {
    console.error('Error processing delivery:', error);
    throw error;
  }
}

/**
 * Add commission to seller wallet
 * @param {Object} order - Order object
 * @returns {Promise<Object>} - Updated wallet
 */
async function addCommission(order) {
  try {
    // Get or create seller wallet
    let wallet = await Wallet.findOne({ user: order.seller });
    
    if (!wallet) {
      wallet = new Wallet({
        user: order.seller,
        balance: 0
      });
    }
    
    // Calculate commission (assuming 95% goes to seller)
    const commission = order.price * 0.95;
    
    // Add transaction to wallet
    wallet.transactions.push({
      type: 'commission',
      amount: commission,
      description: `Commission from order ${order.orderNumber}`,
      reference: order._id,
      referenceModel: 'order',
      status: 'completed'
    });
    
    // Update balance
    wallet.balance += commission;
    
    await wallet.save();
    
    return wallet;
  } catch (error) {
    console.error('Error adding commission:', error);
    throw error;
  }
}

/**
 * Get user wallet with transaction history
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Wallet object
 */
async function getUserWallet(userId) {
  try {
    let wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: 0
      });
      await wallet.save();
    }
    
    return wallet;
  } catch (error) {
    console.error('Error getting user wallet:', error);
    throw error;
  }
}

/**
 * Get order history for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array<Object>>} - Order history
 */
async function getOrderHistory(userId, filters = {}) {
  try {
    const query = { customer: userId };
    
    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.product) query.product = filters.product;
    
    // Apply sorting
    let sort = {};
    if (filters.sort) {
      switch (filters.sort) {
        case 'newest':
          sort = { date: -1 };
          break;
        case 'oldest':
          sort = { date: 1 };
          break;
        default:
          sort = { date: -1 };
      }
    } else {
      sort = { date: -1 };
    }
    
    // Apply pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('product', 'name price type category')
      .populate('seller', 'name email');
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting order history:', error);
    throw error;
  }
}

/**
 * Get sales for a seller
 * @param {string} sellerId - Seller ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array<Object>>} - Sales history
 */
async function getSales(sellerId, filters = {}) {
  try {
    const query = { seller: sellerId };
    
    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.product) query.product = filters.product;
    
    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }
    
    // Apply sorting
    let sort = {};
    if (filters.sort) {
      switch (filters.sort) {
        case 'newest':
          sort = { date: -1 };
          break;
        case 'oldest':
          sort = { date: 1 };
          break;
        default:
          sort = { date: -1 };
      }
    } else {
      sort = { date: -1 };
    }
    
    // Apply pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const orders = await Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('product', 'name price type category')
      .populate('customer', 'name email');
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    // Get sales analytics
    const completedOrders = await Order.find({ seller: sellerId, status: 'completed' });
    const totalSales = completedOrders.reduce((total, order) => total + order.price, 0);
    const totalOrders = completedOrders.length;
    
    return {
      orders,
      analytics: {
        totalSales,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting sales:', error);
    throw error;
  }
}

/**
 * Generate unique download token for file download
 * @param {string} orderId - Order ID
 * @returns {Promise<string>} - Download token
 */
async function generateDownloadToken(orderId) {
  try {
    const order = await Order.findById(orderId);
    
    if (!order || order.status !== 'completed' || !order.deliveryData.delivered) {
      throw new Error('Order not eligible for download');
    }
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token with the order ID (this would typically be in Redis or similar)
    // For simplicity, we'll just return the token here
    
    return token;
  } catch (error) {
    console.error('Error generating download token:', error);
    throw error;
  }
}

module.exports = {
  createProduct,
  getProducts,
  addStock,
  createOrder,
  updateOrderStatus,
  processPayment,
  reserveStock,
  returnStock,
  processDelivery,
  getUserWallet,
  getOrderHistory,
  getSales,
  generateDownloadToken
};