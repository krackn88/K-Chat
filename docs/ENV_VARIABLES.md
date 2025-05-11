# Environment Variables Guide

This document explains the environment variables used in K-Chat. Copy the `.env.template` file to `.env` and configure the values according to your setup.

## Core Application Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port on which the server will run | `5000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `JWT_SECRET` | Secret key for JWT token generation | `your_secure_random_string` |
| `UPLOAD_PATH` | Path for file uploads | `./uploads` |
| `APP_DEBUG` | Enable debug mode | `true` or `false` |
| `MCP_PORT` | Port for additional services | `1337` |

## Database Configuration

### MongoDB (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/k-chat` |

### Azure Cosmos DB (Optional)
| Variable | Description | Example |
|----------|-------------|---------|
| `COSMOS_URL` | Cosmos DB endpoint | `https://your-cosmos.documents.azure.com:443/` |
| `COSMOS_KEY` | Cosmos DB access key | `your_cosmos_key` |
| `COSMOS_DB` | Database name | `your_database` |
| `COSMOS_CONTAINER` | Container name | `your_container` |
| `DATABASE_URL` | Alternative database URL | `sqlite:///app.db` |

## Storage Configuration

### Local Storage (Default)
Local file system is used by default with the path specified in `UPLOAD_PATH`.

### Azure Blob Storage (Optional)
| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;...` |
| `AZURE_BLOB_CONTAINER` | Blob container name | `your_container_name` |

## AI Integration

### Azure OpenAI Configuration
| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI service endpoint | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | API key for Azure OpenAI | `your_api_key` |
| `AZURE_OPENAI_DEPLOYMENT_GPT4O` | GPT-4o model deployment name | `gpt-4o` |
| `AZURE_OPENAI_DEPLOYMENT_O3MINI` | o3-mini model deployment name | `o3-mini` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-11-20` |

## Telegram Bot Integration

| Variable | Description | Example |
|----------|-------------|---------|
| `API_ID` | Telegram API ID | `12345678` |
| `API_HASH` | Telegram API hash | `abcdef1234567890abcdef` |
| `BOT_TOKEN` | Telegram bot token | `1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ` |

## Search Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_SEARCH_ENDPOINT` | Azure Cognitive Search endpoint | `https://your-search.search.windows.net` |
| `AZURE_SEARCH_KEY` | Search service API key | `your_search_key` |
| `AZURE_SEARCH_INDEX` | Search index name | `your_index_name` |

## Security Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `KEY_VAULT_URL` | Azure Key Vault URL | `https://your-vault.vault.azure.net/` |
| `GITHUB_TOKEN` | GitHub token for repository operations | `your_github_token` |

## Required vs Optional Variables

At minimum, you need to configure:
- Basic application settings (`PORT`, `NODE_ENV`, `JWT_SECRET`)
- Database connection (`MONGODB_URI`)

All Azure services are optional and can be added as your application scales.

## Security Best Practices

1. **Never commit** your `.env` file to version control
2. Use strong, unique values for secrets and keys
3. Rotate keys periodically
4. Consider using Azure Key Vault for production deployments
5. Restrict network access to your MongoDB instance
6. Use HTTPS in production
