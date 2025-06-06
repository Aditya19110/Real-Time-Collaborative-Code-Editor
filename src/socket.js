// initSocket.js
import { io } from 'socket.io-client';

export const initSocket = () => {
  const options = {
    forceNew: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
    transports: ['websocket'],
  };

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://real-time-collaborative-code-editor-hpju.onrender.com';

  return io(backendUrl, options);
};