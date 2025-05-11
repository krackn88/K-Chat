/**
 * PostgreSQL Database Initialization Script
 * 
 * This script initializes the PostgreSQL database for K-Chat's inventory management.
 * It creates the necessary tables and indexes for storing and managing inventory items.
 */

const pgDb = require('../services/db/postgres');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Initializing PostgreSQL database...');

// Initialize database
pgDb.initDatabase()
  .then(() => {
    console.log('PostgreSQL database initialized successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error initializing PostgreSQL database:', err);
    process.exit(1);
  });
