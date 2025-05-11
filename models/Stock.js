const mongoose = require('mongoose');

const StockSchema = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  used: {
    type: Boolean,
    default: false
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'order'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('stock', StockSchema);