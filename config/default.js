/**
 * Default configuration for K-Chat
 * IMPORTANT: This file should NOT contain any actual credentials
 * All sensitive values are loaded from environment variables
 */

module.exports = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    debug: process.env.APP_DEBUG === 'true'
  },
  
  database: {
    // Primary database (Azure Cosmos DB)
    cosmos: {
      enabled: true,
      url: process.env.COSMOS_URL,
      key: process.env.COSMOS_KEY,
      database: process.env.COSMOS_DB,
      container: process.env.COSMOS_CONTAINER
    },
    
    // Fallback/local database (SQLite)
    sqlite: {
      enabled: false,
      url: process.env.DATABASE_URL
    }
  },
  
  storage: {
    // Azure Blob Storage for file uploads
    azure: {
      enabled: true,
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      container: process.env.AZURE_BLOB_CONTAINER
    },
    
    // Local file storage (fallback)
    local: {
      enabled: !process.env.AZURE_STORAGE_CONNECTION_STRING,
      path: './uploads'
    }
  },
  
  search: {
    // Azure Cognitive Search
    azure: {
      enabled: true,
      endpoint: process.env.AZURE_SEARCH_ENDPOINT,
      key: process.env.AZURE_SEARCH_KEY,
      index: process.env.AZURE_SEARCH_INDEX
    }
  },
  
  ai: {
    // Azure OpenAI integration
    azureOpenAI: {
      enabled: true,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      key: process.env.AZURE_OPENAI_API_KEY,
      deployments: {
        gpt4o: process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O,
        o3mini: process.env.AZURE_OPENAI_DEPLOYMENT_O3MINI
      },
      apiVersion: process.env.AZURE_OPENAI_API_VERSION
    }
  },
  
  integrations: {
    // Telegram Bot integration
    telegram: {
      enabled: process.env.TELEGRAM_BOT_TOKEN ? true : false,
      apiId: process.env.TELEGRAM_API_ID,
      apiHash: process.env.TELEGRAM_API_HASH,
      botToken: process.env.TELEGRAM_BOT_TOKEN
    },
    
    // GitHub integration
    github: {
      enabled: process.env.GITHUB_TOKEN ? true : false,
      token: process.env.GITHUB_TOKEN
    },
    
    // Azure Key Vault for secure credential storage
    keyVault: {
      enabled: process.env.KEY_VAULT_URL ? true : false,
      url: process.env.KEY_VAULT_URL
    }
  }
};
