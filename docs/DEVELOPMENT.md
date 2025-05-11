# Development Guide

## Project Structure

```
K-Chat/
├── client/               # React frontend
├── middleware/           # Express middleware functions
├── models/               # MongoDB models
├── routes/               # Express API routes
├── uploads/              # File uploads directory
├── docs/                 # Documentation
├── server.js             # Main server file
├── package.json          # Dependencies and scripts
└── .env                  # Environment variables
```

## Backend Development

### Adding a New Route

1. Create a route file in the `routes/` directory
2. Define your Express router and endpoints
3. Import and use the router in `server.js`

Example:

```javascript
// routes/example.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json({ msg: 'Example route' });
});

module.exports = router;

// In server.js
app.use('/api/example', require('./routes/example'));
```

### Creating a New Model

1. Create a model file in the `models/` directory
2. Define your Mongoose schema and export it

Example:

```javascript
const mongoose = require('mongoose');

const ExampleSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('example', ExampleSchema);
```

### Adding Middleware

1. Create a middleware file in the `middleware/` directory
2. Export a function that takes (req, res, next) parameters

Example:

```javascript
module.exports = function(req, res, next) {
  console.log('Middleware executed');
  next();
};
```

## Frontend Development

The React frontend will be developed in the `client/` directory. Here's a recommended frontend structure:

```
client/
├── public/
├── src/
│   ├── components/       # Reusable components
│   ├── context/          # React context for state management
│   ├── pages/            # Page components
│   ├── utils/            # Helper functions
│   ├── App.js            # Main app component
│   └── index.js          # Entry point
└── package.json
```

## AI Integration

To integrate AI functionality:

1. Add your AI provider keys to the `.env` file
2. Create adapter classes for each AI provider in a new `services/ai/` directory
3. Use these adapters in your routes to process messages

## Best Practices

- Use async/await for asynchronous operations
- Validate all incoming data with express-validator
- Use middleware for authentication and permissions
- Keep route handlers clean and delegate business logic to service classes
- Write tests for critical functionality
- Use environment variables for configuration
- Document your API endpoints

## Pull Request Process

1. Create a feature branch from `main`
2. Implement your changes with clear commit messages
3. Update documentation if necessary
4. Create a pull request with a description of changes