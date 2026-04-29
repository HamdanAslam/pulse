import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: true,
    });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return useMemo(
    () => ({
      connected,
      emit: (event, ...args) => socketRef.current?.emit(event, ...args),
      on: (event, handler) => {
        socketRef.current?.on(event, handler);
        return () => socketRef.current?.off(event, handler);
      },
    }),
    [connected],
  );
};
