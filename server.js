const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configuration
const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/k-chat',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  appDebug: process.env.APP_DEBUG === 'true'
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.uploadPath)) {
  fs.mkdirSync(config.uploadPath, { recursive: true });
}

// Database connection
mongoose.connect(config.mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize PostgreSQL database for inventory
try {
  const pgDb = require('./services/db/postgres');
  pgDb.initDatabase()
    .then(() => console.log('PostgreSQL database initialized'))
    .catch(err => console.error('Error initializing PostgreSQL database:', err));
} catch (error) {
  console.warn('PostgreSQL database not configured:', error.message);
}

// Start automation agent
try {
  if (process.env.ENABLE_AUTOMATION === 'true') {
    const automation = require('./services/agents/automation');
    automation.startAllJobs()
      .then(result => console.log('Automation agents started:', result.message))
      .catch(err => console.error('Error starting automation agents:', err));
  }
} catch (error) {
  console.warn('Automation not configured:', error.message);
}

// API routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/openbullet', require('./routes/openbullet'));

// Telegram Bot integration (if configured)
if (process.env.BOT_TOKEN) {
  try {
    const { startBot } = require('./services/telegram/bot');
    const { getAIResponse } = require('./services/ai/agents');
    
    // Start the bot with message handler
    startBot(async ({ message, userId, firstName }) => {
      console.log(`Telegram message from ${firstName} (${userId}): ${message}`);
      return await getAIResponse(userId, message);
    }).catch(err => {
      console.error('Failed to start Telegram bot:', err);
    });
    
    console.log('Telegram bot integration enabled');
  } catch (error) {
    console.error('Error setting up Telegram bot:', error);
  }
}

// Serve uploaded files with authentication middleware
const auth = require('./middleware/auth');
app.use('/api/uploads', auth, express.static(config.uploadPath));

// Serve static assets in production
if (config.nodeEnv === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });
  
  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });
  
  // Send message to a room
  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('receive_message', data);
  });
  
  // User typing indicator
  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Debug mode logging
if (config.appDebug) {
  console.log('Debug mode enabled');
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Start server
server.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});
