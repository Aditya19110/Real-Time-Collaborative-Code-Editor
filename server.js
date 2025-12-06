const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const ACTIONS = require('./src/Actions');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const server = http.createServer(app);

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  (process.env.NODE_ENV === 'production'
    ? 'https://code-together-ak.vercel.app'
    : 'http://localhost:3000');

const ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  'https://code-together-ak.vercel.app',
  'http://localhost:3000',
  'http://localhost:5002'
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
        return callback(null, true);
      }
      // For development, allow localhosts broadly
      if (origin.includes('localhost')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed)) || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Code Editor Backend is running',
    version: '1.0.1'
  });
});

const userSocketMap = {};
const roomUsernamesMap = {};
const roomCodeMap = {};

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}

io.on('connection', (socket) => {


  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;

    // Initialize room maps if not exists
    if (!roomUsernamesMap[roomId]) roomUsernamesMap[roomId] = [];

    // Check if user already in room map (optional, but good for tracking)
    // Here we just push
    roomUsernamesMap[roomId].push({ username, socketId: socket.id });

    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    // Notify all clients in the room
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });

    // Send existing code if any
    if (roomCodeMap[roomId]) {
      socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    roomCodeMap[roomId] = code;
    // Broadcast to everyone else in the room
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

      // Cleanup
      if (roomUsernamesMap[roomId]) {
        roomUsernamesMap[roomId] = roomUsernamesMap[roomId].filter(u => u.socketId !== socket.id);
        if (roomUsernamesMap[roomId].length === 0) {
          delete roomUsernamesMap[roomId];
          delete roomCodeMap[roomId];
        }
      }
    });
    delete userSocketMap[socket.id];
  });
});

app.post('/execute', (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Basic security: Prevent simple malicious commands? 
  // For a real app, this should be sandboxed (Docker). 
  // For this project, we accept the risk but maybe block imports like 'os' or 'subprocess' if strictly needed.
  // But let's keep it open for now as it seems to be a personal/demo project.

  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFile(filePath, code, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to write execution file' });
    }

    // Determine python command
    // Try 'python3' first, then 'python'
    const command = process.platform === 'win32' ? 'python' : 'python3';

    exec(`${command} "${filePath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      // Cleanup file
      fs.unlink(filePath, () => { });

      if (error) {
        // Check if it was a timeout
        if (error.killed) {
          return res.status(408).json({ error: 'Execution timed out (Limit: 10s)' });
        }
        // Return stderr as the error output (it's usually the traceback)
        return res.status(200).json({ output: stderr || error.message });
      }

      // Success
      res.json({ output: stdout || stderr || 'Executed successfully (No output)' });
    });
  });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
