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
  // Enhanced role system
  role: {
    type: String,
    enum: ['admin', 'mod', 'seller', 'member', 'user', 'guest'],
    default: 'user'
  },
  // Legacy fields
  isAdmin: {
    type: Boolean,
    default: false
  },
  isSeller: {
    type: Boolean,
    default: false
  },
  // Permissions map
  permissions: {
    manageUsers: { type: Boolean, default: false },
    manageProducts: { type: Boolean, default: false },
    manageOrders: { type: Boolean, default: false },
    manageContent: { type: Boolean, default: false },
    viewAnalytics: { type: Boolean, default: false },
    useAI: { type: Boolean, default: false },
    createChannels: { type: Boolean, default: false }
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
  // Access control (legacy, use role instead)
  roles: {
    type: [String],
    default: ['user']
  },
  // User statistics
  stats: {
    lastLogin: Date,
    messagesSent: {
      type: Number,
      default: 0
    },
    purchasesMade: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    accountCreated: {
      type: Date,
      default: Date.now
    }
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Set permissions based on role
UserSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    // Reset all permissions
    this.permissions = {
      manageUsers: false,
      manageProducts: false,
      manageOrders: false,
      manageContent: false,
      viewAnalytics: false,
      useAI: false,
      createChannels: false
    };
    
    // Set permissions based on role
    switch (this.role) {
      case 'admin':
        this.permissions = {
          manageUsers: true,
          manageProducts: true,
          manageOrders: true,
          manageContent: true,
          viewAnalytics: true,
          useAI: true,
          createChannels: true
        };
        this.isAdmin = true;
        this.isSeller = true;
        break;
      case 'mod':
        this.permissions = {
          manageUsers: true,
          manageContent: true,
          viewAnalytics: true,
          useAI: true,
          createChannels: true
        };
        this.isAdmin = false;
        break;
      case 'seller':
        this.permissions = {
          manageProducts: true,
          manageOrders: true,
          viewAnalytics: true,
          useAI: true,
          createChannels: true
        };
        this.isSeller = true;
        break;
      case 'member':
        this.permissions = {
          useAI: true,
          createChannels: true
        };
        break;
      case 'user':
        this.permissions.useAI = true;
        break;
      case 'guest':
        // No permissions
        break;
    }
  }
  
  next();
});

module.exports = mongoose.model('user', UserSchema);
