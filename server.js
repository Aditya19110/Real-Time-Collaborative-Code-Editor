const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const ACTIONS = require('./src/Actions');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const server = http.createServer(app);

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 
  process.env.NODE_ENV === 'production' 
    ? 'https://real-time-collaborative-code-editor-nine.vercel.app'
    : 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  maxHttpBufferSize: 1e6, // 1MB buffer
  connectTimeout: 45000,
  transports: ['websocket', 'polling'],
  cookie: false,
  serveClient: false,
});

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);
app.use(bodyParser.json());

const userSocketMap = {};
const roomUsernamesMap = {};

// Connection rate limiting
const connectionTracker = new Map();
const CONNECTION_RATE_LIMIT = 3; // Max 3 connections per IP per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  if (!connectionTracker.has(ip)) {
    connectionTracker.set(ip, [now]);
    return false;
  }
  
  const connections = connectionTracker.get(ip);
  // Remove old connections outside the window
  const recentConnections = connections.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentConnections.length >= CONNECTION_RATE_LIMIT) {
    console.log(`🚫 Rate limit exceeded for IP: ${ip}`);
    return true;
  }
  
  recentConnections.push(now);
  connectionTracker.set(ip, recentConnections);
  return false;
}
const roomCodeMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}

io.on('connection', (socket) => {
  const clientIP = socket.handshake.address || socket.conn.remoteAddress;
  
  // Rate limiting check
  if (isRateLimited(clientIP)) {
    console.log(`🚫 Connection rejected due to rate limit: ${socket.id} from ${clientIP}`);
    socket.emit(ACTIONS.ERROR, { message: 'Too many connection attempts. Please wait a moment.' });
    socket.disconnect(true);
    return;
  }
  
  console.log('✅ Socket connected:', socket.id, 'from IP:', clientIP);

  // Track connection time
  const connectionTime = Date.now();
  
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log(`➡️  ${username} joining room ${roomId}`);

    // Prevent duplicate usernames in the same room
    if (roomUsernamesMap[roomId]?.includes(username)) {
      socket.emit(ACTIONS.ERROR, { message: `${username} is already in the room` });
      return;
    }

    userSocketMap[socket.id] = username;
    roomUsernamesMap[roomId] = roomUsernamesMap[roomId] || [];
    roomUsernamesMap[roomId].push(username);
    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    if (roomCodeMap[roomId]) {
      socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
    }

    io.to(roomId).emit(ACTIONS.JOINED, {
      clients,
      username,
      socketId: socket.id,
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    roomCodeMap[roomId] = code;
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('heartbeat', () => {
    socket.emit('heartbeat-ack');
  });

  socket.on('disconnect', (reason) => {
    const connectionDuration = Date.now() - connectionTime;
    console.log(`❌ Socket disconnected: ${socket.id}, reason: ${reason}, duration: ${connectionDuration}ms`);
    
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap[socket.id],
        });

        if (roomUsernamesMap[roomId]) {
          roomUsernamesMap[roomId] = roomUsernamesMap[roomId].filter(
            (u) => u !== userSocketMap[socket.id]
          );
        }
      }
    });

    delete userSocketMap[socket.id];
  });
});

app.post('/execute', (req, res) => {
  const { code } = req.body;

  if (typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ error: 'Invalid code input' });
  }

  const safeCode = code.replace(/[`;$|&{}]/g, '');
  const fileName = `${Date.now()}.py`;
  const tempDir = path.join(__dirname, 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filePath = path.join(tempDir, fileName);

  fs.writeFile(filePath, safeCode, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to write code to file' });

    exec(`python3 "${filePath}"`, (error, stdout, stderr) => {
      if (error || stderr) {
        return res.status(400).json({ error: stderr || error.message });
      }

      res.json({ output: stdout });

      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });
  });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});