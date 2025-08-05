// initSocket.js
import { io } from 'socket.io-client';

export const initSocket = (serverPath) => {
  const options = {
    forceNew: false, // Don't force new connection - reuse existing ones
    reconnection: true,
    reconnectionAttempts: 3, // Reduced attempts to prevent spam
    reconnectionDelay: 3000, // Increased delay
    reconnectionDelayMax: 15000, // Increased max delay
    timeout: 30000, // Increased timeout
    transports: ['websocket', 'polling'],
    autoConnect: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB buffer
    upgrade: true,
    rememberUpgrade: true,
  };

  const backendUrl = serverPath || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002';

  console.log('🔗 Connecting to server:', backendUrl);
  
  const socket = io(backendUrl, options);

  // Enhanced connection handling
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server forcefully disconnected, try to reconnect
      socket.connect();
    }
  });

  socket.on('connect_error', (error) => {
    console.error('🔴 Connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔄 Reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('🔴 Reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Failed to reconnect');
  });

  return socket;
};