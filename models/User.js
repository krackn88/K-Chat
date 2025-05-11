const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  bio: {
    type: String
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isSeller: {
    type: Boolean,
    default: false
  },
  sellerProfile: {
    storeName: String,
    description: String,
    payoutMethod: {
      type: String,
      enum: ['crypto', 'bank', 'paypal'],
    },
    payoutDetails: Object,
    sellerSince: {
      type: Date,
      default: Date.now
    },
    totalSales: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  // Subscription details
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium', 'business'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    features: [String]
  },
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  // Security settings
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    lastPasswordChange: Date,
    loginHistory: [{
      ip: String,
      device: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Access control
  roles: {
    type: [String],
    default: ['user']
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('user', UserSchema);
