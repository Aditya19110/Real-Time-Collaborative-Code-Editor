import { io } from 'socket.io-client';

export const initSocket = (serverPath) => {
  const options = {
    forceNew: true,
    reconnection: true, // Enable reconnection
    reconnectionAttempts: 'Infinity', // Try indefinitely to reconnect
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'], // Try websocket first
    autoConnect: true,
    withCredentials: true, // If using cookies/sessions
  };

  const backendUrl = serverPath || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002';
  
  // Singleton pattern could be implemented here if multiple calls are potential issue, 
  // but for now we follow the existing pattern as it's used in useEffect with cleanup.
  
  const socket = io(backendUrl, options);
  return socket;
};