const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  // For guest checkouts
  email: {
    type: String
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['crypto', 'balance', 'credit'],
      required: true
    },
    transactionId: String,
    address: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    details: Object
  },
  // Custom fields filled by the customer
  customFields: [{
    name: String,
    value: String
  }],
  deliveryData: {
    contentType: String, // 'text', 'file', 'serial'
    content: String, // Text content or file path
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date
  },
  ipAddress: String,
  userAgent: String,
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  notes: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Generate a unique order number
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    this.orderNumber = `${year}${month}${day}-${random}`;
  }
  next();
});

module.exports = mongoose.model('order', OrderSchema);