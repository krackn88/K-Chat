const mongoose = require('mongoose');

const AIAgentSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  avatar: {
    type: String
  },
  apiEndpoint: {
    type: String,
    required: true
  },
  apiKey: {
    type: String
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('aiagent', AIAgentSchema);