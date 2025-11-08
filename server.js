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
  (process.env.NODE_ENV === 'production' 
    ? 'https://code-together-ak.vercel.app'
    : 'http://localhost:3000');

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
  maxHttpBufferSize: 1e6,
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

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Code Editor Backend is running',
    frontend: FRONTEND_ORIGIN 
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const userSocketMap = {};
const roomUsernamesMap = {};
const connectionTracker = new Map();
const CONNECTION_RATE_LIMIT = 3;
const RATE_LIMIT_WINDOW = 60000;

function isRateLimited(ip) {
  const now = Date.now();
  if (!connectionTracker.has(ip)) {
    connectionTracker.set(ip, [now]);
    return false;
  }
  
  const connections = connectionTracker.get(ip);
  const recentConnections = connections.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentConnections.length >= CONNECTION_RATE_LIMIT) {
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
  
  if (isRateLimited(clientIP)) {
    console.log(`Connection rejected due to rate limit: \${socket.id} from \${clientIP}`);
    socket.emit(ACTIONS.ERROR, { message: 'Too many connection attempts. Please wait a moment.' });
    socket.disconnect(true);
    return;
  }
  
  console.log('Socket connected:', socket.id, 'from IP:', clientIP);

  const connectionTime = Date.now();
  
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log(`\${username} (\${socket.id}) joining room \${roomId}`);

    if (userSocketMap[socket.id]) {
      console.log(`Socket \${socket.id} already has username: \${userSocketMap[socket.id]}`);
    }

    const existingUsersInRoom = roomUsernamesMap[roomId] || [];
    const isDuplicateUsername = existingUsersInRoom.some(
      (user) => user.username === username && user.socketId !== socket.id
    );

    if (isDuplicateUsername) {
      console.log(`Duplicate username rejected: \${username} in room \${roomId}`);
      socket.emit(ACTIONS.ERROR, { 
        message: `Username "\${username}" is already taken in this room. Please choose another.` 
      });
      return;
    }

    userSocketMap[socket.id] = username;
    
    if (!roomUsernamesMap[roomId]) {
      roomUsernamesMap[roomId] = [];
    }
    
    roomUsernamesMap[roomId].push({ username, socketId: socket.id });
    
    socket.join(roomId);
    console.log(`\${username} (\${socket.id}) successfully joined room \${roomId}`);

    const clients = getAllConnectedClients(roomId);
    console.log(`Clients in room \${roomId}:`, clients.map(c => c.username).join(', '));

    if (roomCodeMap[roomId]) {
      console.log(`Sending existing code to \${username}`);
      socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
    }

    io.to(roomId).emit(ACTIONS.JOINED, {
      clients,
      username,
      socketId: socket.id,
    });
    
    console.log(`Broadcasted JOINED event to room \${roomId}`);
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    roomCodeMap[roomId] = code;
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    console.log(`Code change broadcasted in room \${roomId} (\${code.length} chars)`);
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
    const username = userSocketMap[socket.id];
    console.log(`Socket disconnected: \${socket.id} (\${username}), reason: \${reason}, duration: \${connectionDuration}ms`);
    
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap[socket.id],
        });

        if (roomUsernamesMap[roomId]) {
          roomUsernamesMap[roomId] = roomUsernamesMap[roomId].filter(
            (user) => user.socketId !== socket.id
          );
          
          if (roomUsernamesMap[roomId].length === 0) {
            delete roomUsernamesMap[roomId];
            delete roomCodeMap[roomId];
            console.log(`Room \${roomId} cleaned up (empty)`);
          }
        }
      }
    });

    delete userSocketMap[socket.id];
  });
});

app.post('/execute', (req, res) => {
  console.log('Code execution request received');
  const { code } = req.body;

  if (typeof code !== 'string' || code.trim() === '') {
    console.log('Invalid code input');
    return res.status(400).json({ error: 'Invalid code input' });
  }

  const safeCode = code.replace(/[`\$]/g, '');
  const fileName = `\${Date.now()}.py`;
  const tempDir = path.join(__dirname, 'temp');

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, fileName);
  console.log(`Writing code to: \${filePath}`);

  fs.writeFile(filePath, safeCode, (err) => {
    if (err) {
      console.error('Failed to write file:', err);
      return res.status(500).json({ error: 'Failed to write code to file' });
    }

    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`Executing: \${pythonCommand} "\${filePath}"`);

    exec(`\${pythonCommand} "\${filePath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
      });

      if (error) {
        console.error('Execution error:', error.message);
        if (error.killed || error.signal === 'SIGTERM') {
          return res.status(400).json({ 
            error: 'Code execution timed out (max 10 seconds)' 
          });
        }
        return res.status(400).json({ 
          error: stderr || error.message || 'Code execution failed' 
        });
      }

      if (stderr) {
        console.log('Stderr:', stderr);
        if (!stdout) {
          return res.status(400).json({ error: stderr });
        }
      }

      console.log('Code executed successfully');
      res.json({ output: stdout || 'Code executed successfully (no output)' });
    });
  });
});

const PORT = process.env.PORT || 5002;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
