const mongoose = require('mongoose');

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
  category: {
    type: String,
    enum: ['accounts', 'combos', 'subscriptions', 'digital', 'other'],
    default: 'other'
  },
  subcategory: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['service', 'file', 'account', 'combo', 'subscription'],
    default: 'service'
  },
  deliveryType: {
    type: String,
    enum: ['digital', 'manual'],
    default: 'digital'
  },
  stock: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  stockWarning: {
    type: Number,
    default: 5 // Notify seller when stock reaches this level
  },
  active: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  quantityOptions: [{
    quantity: Number,
    price: Number
  }],
  // For file-type products, store the file ID
  fileId: {
    type: String
  },
  // For account-type products, store the template
  template: {
    type: String,
    default: 'email:pass'
  },
  // Custom fields for the product
  customFields: [{
    name: String,
    required: Boolean,
    type: String, // text, number, select
    options: [String] // For select type
  }],
  // For combo file products
  comboCount: {
    type: Number,
    default: 0
  },
  // OpenBullet2 integration
  obConfigId: {
    type: String,
    description: 'OpenBullet2 config ID for stock collection'
  },
  obValidationConfigId: {
    type: String,
    description: 'OpenBullet2 config ID for validation'
  },
  obSchedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'auto'],
      default: 'auto'
    },
    minStock: {
      type: Number,
      default: 10
    },
    batchSize: {
      type: Number,
      default: 100
    },
    lastRun: Date,
    nextRun: Date
  },
  // Source and quality metrics
  sourceInfo: {
    provider: String,
    quality: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    validationRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastValidated: Date
  },
  // Database storage - allows switching between MongoDB and PostgreSQL
  storageType: {
    type: String,
    enum: ['mongodb', 'postgres', 'hybrid'],
    default: 'mongodb'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  soldCount: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('product', ProductSchema);