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

// Allow both local dev and deployed frontend origin
const allowedOrigins = [
  'http://localhost:3000',
  'https://real-time-collaborative-code-editor.vercel.app', // ← replace with your actual frontend domain
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  },
});

const userSocketMap = {};
const roomUsernamesMap = {};
const roomCodeMap = {};

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(bodyParser.json());

// Helper: Get connected clients in a room
function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}

// Socket.io Handling
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    if (roomUsernamesMap[roomId]?.includes(username)) {
      socket.emit(ACTIONS.ERROR, { message: `${username} is already in the room` });
      return;
    }

    userSocketMap[socket.id] = username;
    roomUsernamesMap[roomId] = roomUsernamesMap[roomId] || [];
    roomUsernamesMap[roomId].push(username);

    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    // Sync latest code
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
          (username) => username !== userSocketMap[socket.id]
        );
      }
    });

    delete userSocketMap[socket.id];
  });
});

// Python Code Execution Endpoint
app.post('/execute', (req, res) => {
  const { code } = req.body;

  if (typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ error: 'Invalid code input' });
  }

  const safeCode = code.replace(/([`;$|&])/g, '');
  const fileName = `${Date.now()}.py`;
  const tempDir = path.join(__dirname, 'temp');
  const filePath = path.join(tempDir, fileName);

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  fs.writeFile(filePath, safeCode, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to write code to file' });

    exec(`python3 "${filePath}"`, (error, stdout, stderr) => {
      fs.unlink(filePath, (delErr) => {
        if (delErr) console.error('Error deleting temp file:', delErr);
      });

      if (error || stderr) {
        return res.status(400).json({ error: stderr || error.message });
      }

      res.json({ output: stdout });
    });
  });
});

// Optional: Health check route for Render
app.get('/', (req, res) => {
  res.send('Echo Code backend is live 🎉');
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));