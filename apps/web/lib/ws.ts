"use client";

import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores/auth";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4001";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().token;
  socket = io(WS_URL, {
    transports: ["websocket"],
    auth: { token }
  });

  socket.on("connect_error", (err) => {
    console.error("[WS] Connection error:", err.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
