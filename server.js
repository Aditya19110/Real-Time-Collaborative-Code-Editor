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

// Create HTTP server
const server = http.createServer(app);

// Replace this with your actual Vercel frontend domain
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://real-time-collaborative-code-editor-nine.vercel.app/';

// Initialize Socket.io server with CORS
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

// Express CORS Middleware
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use(bodyParser.json());

// Socket mappings
const userSocketMap = {};
const roomUsernamesMap = {};
const roomCodeMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}

// Socket.io Events
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log(`Attempting to join room: ${roomId} with username: ${username}`);

    if (roomUsernamesMap[roomId]?.includes(username)) {
      console.log(`${username} is already in the room ${roomId}`);
      socket.emit(ACTIONS.ERROR, { message: `${username} is already in the room` });
      return;
    }

    userSocketMap[socket.id] = username;
    roomUsernamesMap[roomId] = roomUsernamesMap[roomId] || [];
    roomUsernamesMap[roomId].push(username);
    socket.join(roomId);

    console.log(`User ${username} joined room ${roomId}`);

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
    console.log(`Code change detected in room ${roomId}`);
    roomCodeMap[roomId] = code;
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    console.log(`Syncing code to socket ${socketId}`);
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];

    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });

      if (roomUsernamesMap[roomId]) {
        roomUsernamesMap[roomId] = roomUsernamesMap[roomId].filter(
          (u) => u !== userSocketMap[socket.id]
        );
      }
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
});

// Code execution endpoint
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
    if (err) {
      return res.status(500).json({ error: 'Failed to write code to file' });
    }

    exec(`python3 "${filePath}"`, (error, stdout, stderr) => {
      if (error || stderr) {
        res.status(400).json({ error: stderr || error.message });
        return;
      }

      res.json({ output: stdout });

      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });
  });
});

// Start Server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});