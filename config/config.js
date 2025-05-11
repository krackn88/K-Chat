const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB Configuration
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/k-chat',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: '24h',
  
  // File Storage Configuration
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  
  // Azure Blob Storage Configuration
  azure: {
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    blobContainer: process.env.AZURE_BLOB_CONTAINER,
  },
  
  // OpenAI Configuration for AI Integration
  openai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentGpt4o: process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O,
    deploymentO3Mini: process.env.AZURE_OPENAI_DEPLOYMENT_O3MINI,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  },
  
  // Telegram Bot Configuration
  telegram: {
    apiId: process.env.API_ID,
    apiHash: process.env.API_HASH,
    botToken: process.env.BOT_TOKEN,
  },
  
  // Azure Search Configuration
  azureSearch: {
    endpoint: process.env.AZURE_SEARCH_ENDPOINT,
    key: process.env.AZURE_SEARCH_KEY,
    index: process.env.AZURE_SEARCH_INDEX,
  },
  
  // Azure Cosmos DB Configuration
  cosmos: {
    url: process.env.COSMOS_URL,
    key: process.env.COSMOS_KEY,
    database: process.env.COSMOS_DB,
    container: process.env.COSMOS_DB_CONTAINER,
  },
  
  // Azure Key Vault Configuration
  keyVault: {
    url: process.env.KEY_VAULT_URL,
  },
  
  // GitHub Configuration
  github: {
    token: process.env.GITHUB_TOKEN,
  },
  
  // SQLite Configuration (alternative/secondary DB)
  sqliteUrl: process.env.DATABASE_URL,
  
  // Application Configuration
  appDebug: process.env.APP_DEBUG === 'true',
  mcpPort: process.env.MCP_PORT || 1337,
};
