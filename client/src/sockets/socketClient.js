import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
  if (!socket) {
    // In development, we use relative URL to leverage Vite proxy
    // In production, use VITE_API_URL or relative
    const apiUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');
    console.log('[SocketClient] Connecting to:', apiUrl || 'window.location.host');
    socket = io(apiUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
