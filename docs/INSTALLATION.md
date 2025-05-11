# Installation Guide

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

## Step 1: Clone the Repository

```bash
git clone https://github.com/krackn88/K-Chat.git
cd K-Chat
```

## Step 2: Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file and update the variables:

- Generate a strong JWT_SECRET using a tool or random string
- Set up your MongoDB connection string
- Add AI provider API keys if you plan to use AI features

## Step 3: Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Step 4: Run in Development Mode

```bash
# Run both client and server with concurrently
npm run dev:full

# Or run them separately
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run client
```

## Step 5: Build for Production

```bash
# Build the React client
npm run build

# Start the production server
NODE_ENV=production npm start
```

## Self-hosting without a Domain

### Option 1: Local Network

Access via local IP address:

```
http://192.168.x.x:5000
```

### Option 2: Ngrok Tunnel

Install ngrok and create a tunnel:

```bash
ngrok http 5000
```

This will provide a public URL that routes to your local server.

### Option 3: Dynamic DNS

1. Sign up for a free Dynamic DNS service like No-IP or DuckDNS
2. Install their client to keep your IP updated
3. Configure port forwarding on your router

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running and the connection string is correct
- **Port Conflicts**: Change the PORT in the .env file if port 5000 is already in use
- **CORS Issues**: Check that the client URL matches the allowed origins in the server.js file