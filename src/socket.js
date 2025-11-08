import { io } from 'socket.io-client';
export const initSocket = (serverPath) => {
  const options = {
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 15000,
    timeout: 30000,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    upgrade: true,
    rememberUpgrade: true,
  };
  const backendUrl = serverPath || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002';
  const socket = io(backendUrl, options);
  socket.on('connect', () => {
  });
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
  socket.on('connect_error', (error) => {
  });
  socket.on('reconnect', (attemptNumber) => {
  });
  socket.on('reconnect_attempt', (attemptNumber) => {
  });
  socket.on('reconnect_error', (error) => {
  });
  socket.on('reconnect_failed', () => {
  });
  return socket;
};