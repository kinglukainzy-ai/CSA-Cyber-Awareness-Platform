"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Module-level helper so both useEffect (init) and connect() (re-auth) can use it
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
};

interface SocketContextType {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket only once
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000";
    const token = getCookie("access_token");

    socketRef.current = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connect = () => {
    if (socketRef.current && !socketRef.current.connected) {
      const token = getCookie("access_token");
      if (token) socketRef.current.auth = { token };
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
