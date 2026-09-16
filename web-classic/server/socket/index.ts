import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { registerSocketEvents } from "./events";

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer) {
  if (io) return io; // prevent re-init

  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // TODO: restrict in prod
      methods: ["GET", "POST"],
    },
  });

  console.log("🔌 Socket.IO initialized");

  io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);
    registerSocketEvents(io!, socket);

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
