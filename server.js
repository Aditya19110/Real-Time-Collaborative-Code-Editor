const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const ACTIONS = require('./src/Actions');
const cors = require('cors');  // Import the cors package
const fs = require('fs');
const path = require('path');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server with CORS configuration
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',  // Allow requests only from your React app's origin
        methods: ['GET', 'POST'],        // Allow specific methods
        allowedHeaders: ['Content-Type'], // Allow specific headers
    },
});

const userSocketMap = {};  // Mapping for socket IDs and usernames
const roomUsernamesMap = {};  // Mapping for room IDs and usernames in the room
const roomCodeMap = {};  // Store the latest code for each room

// Enable CORS for your frontend (allowing requests from localhost:3000)
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests only from your React app's origin
    methods: ['GET', 'POST'],        // Allow specific methods
    allowedHeaders: ['Content-Type'], // Allow specific headers
}));

app.use(bodyParser.json()); // Middleware to parse JSON bodies

// Function to get all connected clients in a room
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId],
        };
    });
}

// Socket.io Functionality
io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    // Join a room
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        console.log(`Attempting to join room: ${roomId} with username: ${username}`);
        
        // Check if the user is already in the room
        if (roomUsernamesMap[roomId] && roomUsernamesMap[roomId].includes(username)) {
            console.log(`${username} is already in the room ${roomId}`);
            socket.emit(ACTIONS.ERROR, { message: `${username} is already in the room` });
            return;
        }

        // Add the user to the socket map
        userSocketMap[socket.id] = username;

        // Initialize the room if it doesn't exist
        if (!roomUsernamesMap[roomId]) {
            roomUsernamesMap[roomId] = [];
        }
        roomUsernamesMap[roomId].push(username);

        // Join the room
        socket.join(roomId);

        console.log(`User ${username} joined room ${roomId}`);
        
        // Get all connected clients in the room
        const clients = getAllConnectedClients(roomId);

        // Send the latest code to the rejoining user
        if (roomCodeMap[roomId]) {
            socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
        }

        // Notify all users in the room about the new join
        io.to(roomId).emit(ACTIONS.JOINED, {
            clients,
            username,
            socketId: socket.id,
        });
    });

    // Handle code change events
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        console.log(`Code change detected in room ${roomId}`);
        
        // Save the latest code for the room
        roomCodeMap[roomId] = code;
        
        // Broadcast the code change to all clients in the room
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Handle sync code events
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        console.log(`Syncing code to socket ${socketId}`);
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Handle socket disconnect
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];  // Get all rooms the socket is in

        // Handle each room the socket was in
        rooms.forEach((roomId) => {
            console.log(`Socket ${socket.id} is disconnecting from room ${roomId}`);
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });

            // Remove the user from the room's username list
            if (roomUsernamesMap[roomId]) {
                roomUsernamesMap[roomId] = roomUsernamesMap[roomId].filter(
                    (username) => username !== userSocketMap[socket.id]
                );
            }
        });

        // Clean up user mappings
        delete userSocketMap[socket.id];

        // Make sure the socket leaves the room
        socket.leave();
    });
});

// HTTP Endpoint for Python Code Execution (with file creation and execution)
app.post('/execute', (req, res) => {
    const { code } = req.body;

    // Basic security check to prevent harmful inputs
    if (typeof code !== 'string' || code.trim() === '') {
        return res.status(400).json({ error: 'Invalid code input' });
    }

    // Remove any problematic special characters (but don't escape quotes)
    const safeCode = code.replace(/([`;${}|&])/g, '');  // Remove special characters that could cause issues

    // Generate a unique file name to save the code
    const fileName = `${Date.now()}.py`;
    const filePath = path.join(__dirname, 'temp', fileName);

    // Create a temporary directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
        fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    // Save the code to a temporary file
    fs.writeFile(filePath, safeCode, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to write code to file' });
        }

        // Execute the Python file
        exec(`python3 "${filePath}"`, (error, stdout, stderr) => {
            if (error || stderr) {
                res.status(400).json({ error: stderr || error.message });
                return;
            }

            // Return the output of the Python script
            res.json({ output: stdout });

            // Clean up the temporary file after execution
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        });
    });
});

// Server Listener
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));