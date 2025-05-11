const mongoose = require('mongoose');

const ChannelSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'public'],
    default: 'group'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  avatar: {
    type: String
  },
  lastMessage: {
    type: Date
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('channel', ChannelSchema);