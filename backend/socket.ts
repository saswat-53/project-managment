import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server;

export const initIO = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join:project", (projectId: string) => {
      socket.join(`project:${projectId}`);
    });
    socket.on("leave:project", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.io not initialized. Call initIO() first.");
  return io;
};
