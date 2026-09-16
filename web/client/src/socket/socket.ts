import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let activeAuthToken = "";

export function connectSocket(authToken = "") {
  if (socket && authToken && activeAuthToken !== authToken) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    activeAuthToken = authToken;
    socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: authToken ? { token: authToken } : undefined,
    });
  }
  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket not connected");
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeAuthToken = "";
}
