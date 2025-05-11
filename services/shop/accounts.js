const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Generate a secure random password
 * @param {number} length - Password length
 * @returns {string} - Generated password
 */
function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateToken(user) {
  const payload = {
    user: {
      id: user.id
    }
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '30d' }
  );
}

/**
 * Create a new account with generated credentials
 * @param {Object} options - Account options
 * @returns {Promise<Object>} - Created account with credentials
 */
async function createAccount(options = {}) {
  try {
    // Generate email if not provided
    const email = options.email || `user${Date.now()}@kchat.local`;
    
    // Generate password if not provided
    const rawPassword = options.password || generatePassword();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(rawPassword, salt);
    
    // Create user
    const user = new User({
      name: options.name || 'User',
      email,
      password,
      isAdmin: options.isAdmin || false
    });
    
    // Save user to database
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Return account info
    return {
      id: user.id,
      email,
      password: rawPassword, // Return raw password for shop display
      token
    };
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Validate login credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User with token if valid
 */
async function validateLogin(email, password) {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    // Generate token
    const token = generateToken(user);
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token
    };
  } catch (error) {
    console.error('Error validating login:', error);
    throw error;
  }
}

/**
 * Format account for shop display
 * @param {Object} account - Account object
 * @param {string} format - Format type (email:pass, user:pass, etc.)
 * @returns {string} - Formatted account string
 */
function formatAccount(account, format = 'email:pass') {
  switch (format) {
    case 'email:pass':
      return `${account.email}:${account.password}`;
    case 'email:pass:token':
      return `${account.email}:${account.password}:${account.token}`;
    case 'user:pass':
      return `${account.email.split('@')[0]}:${account.password}`;
    case 'json':
      return JSON.stringify(account);
    default:
      return `${account.email}:${account.password}`;
  }
}

module.exports = {
  generatePassword,
  generateToken,
  createAccount,
  validateLogin,
  formatAccount
};