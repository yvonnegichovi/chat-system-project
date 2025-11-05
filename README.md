# Chat System Project

A scalable real-time chat system built with Node.js, Redis, and WebSockets (Socket.IO).

## Features

- **Real-time messaging** using WebSockets (Socket.IO)
- **Scalable architecture** with Redis pub/sub for multi-instance deployment
- **Typing indicators** to show when users are typing
- **User join/leave notifications**
- **Modern responsive UI** with clean design
- **Health check endpoint** for monitoring
- **Graceful shutdown** handling
- **Docker support** for easy deployment

## Architecture

The system uses a pub/sub pattern with Redis to enable horizontal scaling:

1. Multiple server instances can run simultaneously
2. Each instance maintains WebSocket connections with clients
3. Messages are published to Redis
4. All instances subscribe to the same Redis channel
5. Each instance broadcasts received messages to its connected clients

This allows the chat system to scale across multiple servers while maintaining message consistency.

## Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.IO** - WebSocket library for real-time communication
- **Redis** - In-memory data store for pub/sub messaging
- **Docker** - Containerization (optional)

## Prerequisites

- Node.js 14+ installed
- Redis server running (locally or via Docker)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yvonnegichovi/chat-system-project.git
cd chat-system-project
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment (optional):
```bash
cp .env.example .env
# Edit .env if needed
```

## Running the Application

### Option 1: Local Development

1. Start Redis (if not already running):
```bash
redis-server
```

2. Start the chat server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

### Option 2: Using Docker Compose (Recommended for Testing Scalability)

This will start Redis and two chat server instances:

```bash
docker-compose up --build
```

Access the chat servers at:
- Server 1: http://localhost:3000
- Server 2: http://localhost:3001

Open both URLs in different browser windows to test the scalable pub/sub functionality.

## Usage

1. Enter your username on the login screen
2. Click "Join Chat" to enter the chat room
3. Type messages in the input field and press Enter or click Send
4. Messages will be broadcast to all connected users across all server instances

## API Endpoints

- `GET /` - Serves the chat interface
- `GET /health` - Health check endpoint (returns server status and Redis connection state)

## WebSocket Events

### Client → Server
- `join` - User joins the chat (payload: username)
- `chat_message` - Send a chat message (payload: message text)
- `typing` - Typing indicator (payload: boolean)

### Server → Client
- `message` - Receive a chat message (payload: {type, username, message, timestamp})
- `user_typing` - Another user is typing (payload: {username, isTyping})

## Configuration

Environment variables (optional):

- `PORT` - Server port (default: 3000)
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)

## Testing Scalability

To test the pub/sub scalability:

1. Start multiple server instances on different ports:
```bash
PORT=3000 npm start
PORT=3001 npm start
PORT=3002 npm start
```

2. Open each server URL in different browser tabs
3. Send messages from any instance - they should appear on all instances

## Project Structure

```
chat-system-project/
├── server.js           # Main server file with Express, Socket.IO, and Redis
├── public/
│   └── index.html      # Client-side HTML and JavaScript
├── package.json        # Node.js dependencies and scripts
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Multi-container Docker setup
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## License

ISC