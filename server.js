const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const redis = require('redis');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files
app.use(express.static('public'));

// Redis configuration
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

// Track Redis connection status
let redisConnected = false;

// Create Redis clients for pub/sub with retry disabled
const publisher = redis.createClient({
  socket: {
    host: redisHost,
    port: redisPort,
    reconnectStrategy: false // Disable automatic reconnection
  }
});

const subscriber = redis.createClient({
  socket: {
    host: redisHost,
    port: redisPort,
    reconnectStrategy: false // Disable automatic reconnection
  }
});

// Connect to Redis
(async () => {
  try {
    await publisher.connect();
    await subscriber.connect();
    redisConnected = true;
    console.log('Connected to Redis - pub/sub enabled');
  } catch (error) {
    console.log('Redis not available - running in single instance mode');
    console.log('To enable scalability, start Redis server');
  }
})();

// Handle Redis errors silently since we fallback to local broadcast
publisher.on('error', () => {});
subscriber.on('error', () => {});

// Subscribe to the chat channel
const CHAT_CHANNEL = 'chat_messages';

// Only subscribe if Redis is connected
if (redisConnected) {
  subscriber.subscribe(CHAT_CHANNEL, (message) => {
    try {
      const data = JSON.parse(message);
      // Broadcast to all connected clients
      io.emit('message', data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }).catch((err) => {
    console.error('Error subscribing to channel:', err);
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    socket.username = username;
    const joinMessage = {
      type: 'system',
      username: 'System',
      message: `${username} joined the chat`,
      timestamp: new Date().toISOString()
    };
    
    // Publish to Redis for distribution across all instances
    if (redisConnected) {
      publisher.publish(CHAT_CHANNEL, JSON.stringify(joinMessage)).catch((err) => {
        console.error('Error publishing join message:', err);
        // Fallback to local broadcast if Redis publish fails
        io.emit('message', joinMessage);
      });
    } else {
      // Fallback to local broadcast if Redis is unavailable
      io.emit('message', joinMessage);
    }
  });

  // Handle chat messages
  socket.on('chat_message', (message) => {
    const chatMessage = {
      type: 'chat',
      username: socket.username || 'Anonymous',
      message: message,
      timestamp: new Date().toISOString()
    };

    // Publish to Redis for scalable distribution
    if (redisConnected) {
      publisher.publish(CHAT_CHANNEL, JSON.stringify(chatMessage)).catch((err) => {
        console.error('Error publishing chat message:', err);
        // Fallback to local broadcast if Redis publish fails
        io.emit('message', chatMessage);
      });
    } else {
      // Fallback to local broadcast if Redis is unavailable
      io.emit('message', chatMessage);
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('user_typing', {
      username: socket.username,
      isTyping: isTyping
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.username) {
      const leaveMessage = {
        type: 'system',
        username: 'System',
        message: `${socket.username} left the chat`,
        timestamp: new Date().toISOString()
      };
      
      if (redisConnected) {
        publisher.publish(CHAT_CHANNEL, JSON.stringify(leaveMessage)).catch((err) => {
          console.error('Error publishing leave message:', err);
          io.emit('message', leaveMessage);
        });
      } else {
        io.emit('message', leaveMessage);
      }
    }
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    redis: redisConnected ? 'connected' : 'disconnected'
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close();
  if (redisConnected) {
    await publisher.quit();
    await subscriber.quit();
  }
  process.exit(0);
});
