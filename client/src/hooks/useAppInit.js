// App initialization hook: orchestrates auth and socket connection
import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { connectSocket, disconnectSocket } from '../services/socketService';

export const useAppInit = () => {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
  }, [token]);
};
