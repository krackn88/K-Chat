# K-Chat

An open-source, self-hosted messaging platform inspired by Telegram with AI integration capabilities.

## Features

- **Self-hosted**: Host on your own server without requiring a domain
- **Real-time messaging**: One-on-one and group chats
- **File sharing**: Exchange documents, images, and other files
- **End-to-end encryption**: Secure communication between users
- **AI integration**: Connect with AI agents for automated responses
- **Authentication system**: User registration and login functionality
- **Responsive interface**: Works on desktop and mobile devices
- **Open-source**: 100% free and customizable

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: React with Material UI
- **Real-time Communication**: Socket.io
- **Database**: MongoDB with optional Azure Cosmos DB
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: Support for Azure OpenAI and other AI APIs
- **Media Storage**: Local file system with optional Azure Blob Storage
- **Search**: Optional Azure Cognitive Search integration
- **Bot Integration**: Optional Telegram Bot capabilities

## External Services Support

K-Chat can be integrated with various Azure services for enhanced capabilities:
- Azure OpenAI for AI chatbots and assistants
- Azure Blob Storage for file storage
- Azure Cosmos DB for database
- Azure Cognitive Search for message searching
- Azure Key Vault for secrets management

## Self-hosting Without a Domain

K-Chat can be self-hosted using:
- Local network deployment
- Services like ngrok for tunnel access
- IP-based access with optional DDNS

## Environment Configuration

1. Copy the `.env.template` file to `.env` in the root directory
2. Fill in your own credentials and configuration values
3. Never commit your `.env` file to version control

See the [Environment Variables Guide](./docs/ENV_VARIABLES.md) for details on each configuration option.

## Getting Started

Check out the [installation guide](./docs/INSTALLATION.md) for detailed setup instructions.

## Development

See the [development guide](./docs/DEVELOPMENT.md) for information on how to contribute.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
