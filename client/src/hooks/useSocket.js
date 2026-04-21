import { useEffect } from "react";
import { connectSocket, disconnectSocket } from "../sockets/socketClient";
import { useAuthStore } from "../stores/useAuthStore";

export const useSocket = () => {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    // Optional: add global error listeners here
    socket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    return () => {
      // Avoid disconnecting on every re-render if token is stable
      // but if the hook unmounts (app close), we cleanup.
    };
  }, [token]);
};
