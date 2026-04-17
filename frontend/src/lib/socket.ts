import { io } from "socket.io-client";

export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8000", {
  autoConnect: false,
  // Allow WebSocket with polling fallback for corporate/firewall environments
  transports: ["websocket", "polling"],
});
