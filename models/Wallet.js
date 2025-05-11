const mongoose = require('mongoose');

const WalletSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  transactions: [{
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'purchase', 'refund', 'commission'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: String,
    reference: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'transactions.referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['order', 'user']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('wallet', WalletSchema);