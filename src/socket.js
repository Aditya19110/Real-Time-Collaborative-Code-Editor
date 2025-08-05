// initSocket.js
import { io } from 'socket.io-client';

export const initSocket = (serverPath) => {
  const options = {
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    pingTimeout: 60000,
    pingInterval: 25000,
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