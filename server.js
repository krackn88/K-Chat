const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load configuration
const config = require('./config/config');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.nodeEnv === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.uploadPath)) {
  fs.mkdirSync(config.uploadPath, { recursive: true });
}

// Database connection
mongoose.connect(config.mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// API routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/ai', require('./routes/ai'));

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
