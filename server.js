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

// ✅ Correct FRONTEND_ORIGIN (NO trailing slash)
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'https://real-time-collaborative-code-editor-nine.vercel.app';

// Initialize Socket.io server with CORS config
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
});

// Express CORS middleware
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);

app.use(bodyParser.json());

// Maps to track room-user-code info
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
  console.log('✅ Socket connected:', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log(`➡️  ${username} joining room ${roomId}`);

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

// Code Execution API
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

// ✅ Start Server (bind to 0.0.0.0 for Render compatibility)
const PORT = process.env.PORT || 5002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});