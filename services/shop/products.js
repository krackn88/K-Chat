const mongoose = require('mongoose');
const accounts = require('./accounts');

// Define Product Schema
const ProductSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['account', 'combo', 'subscription'],
    default: 'account'
  },
  options: {
    type: Object,
    default: {}
  },
  stock: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  active: {
    type: Boolean,
    default: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const Product = mongoose.model('product', ProductSchema);

// Define Purchase Schema
const PurchaseSchema = mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  credentials: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const Purchase = mongoose.model('purchase', PurchaseSchema);

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
 * Get all active products
 * @returns {Promise<Array<Object>>} - List of products
 */
async function getProducts() {
  try {
    return await Product.find({ active: true });
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * Generate account credentials for a purchase
 * @param {Object} product - Product to purchase
 * @param {string} userId - User ID making the purchase
 * @returns {Promise<Object>} - Purchase details
 */
async function generateCredentials(product, userId) {
  try {
    // Check if product is available
    if (!product.active || (product.stock !== -1 && product.stock <= 0)) {
      throw new Error('Product is not available');
    }
    
    let credentials = '';
    
    // Generate credentials based on product type
    switch (product.type) {
      case 'account': {
        // Create new account
        const newAccount = await accounts.createAccount(product.options);
        credentials = accounts.formatAccount(newAccount, product.options.format || 'email:pass');
        break;
      }
      case 'combo': {
        // Create multiple accounts
        const count = product.options.count || 1;
        const format = product.options.format || 'email:pass';
        const accountList = [];
        
        for (let i = 0; i < count; i++) {
          const newAccount = await accounts.createAccount(product.options);
          accountList.push(accounts.formatAccount(newAccount, format));
        }
        
        credentials = accountList.join('\n');
        break;
      }
      case 'subscription': {
        // Create premium subscription
        const newAccount = await accounts.createAccount({
          ...product.options,
          isAdmin: true // Premium users get admin status
        });
        credentials = accounts.formatAccount(newAccount, 'email:pass:token');
        break;
      }
      default:
        throw new Error('Invalid product type');
    }
    
    // Update stock if needed
    if (product.stock > 0) {
      product.stock -= 1;
      await product.save();
    }
    
    // Create purchase record
    const purchase = new Purchase({
      productId: product._id,
      userId,
      credentials,
      price: product.price
    });
    
    await purchase.save();
    
    return {
      purchase,
      credentials
    };
  } catch (error) {
    console.error('Error generating credentials:', error);
    throw error;
  }
}

/**
 * Get purchase history for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array<Object>>} - Purchase history
 */
async function getPurchaseHistory(userId) {
  try {
    return await Purchase.find({ userId })
      .populate('productId', 'name price type')
      .sort({ date: -1 });
  } catch (error) {
    console.error('Error getting purchase history:', error);
    throw error;
  }
}

module.exports = {
  Product,
  Purchase,
  createProduct,
  getProducts,
  generateCredentials,
  getPurchaseHistory
};