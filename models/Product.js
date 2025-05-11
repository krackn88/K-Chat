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