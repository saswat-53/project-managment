import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { initIO } from "./socket";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());


import userRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import projectRoutes from "./routes/project.route";
import taskRoutes from "./routes/task.route";
import healthRoutes from "./routes/health.route";

app.use("/api/auth", userRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/task", taskRoutes);
app.use("/health", healthRoutes);

// Swagger UI Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Project Management API Docs",
}));

// Root info
app.get("/", (_req, res) => {
  res.json({ message: "Backend Running... | API Docs available at /api-docs | Health check at /health" });
});

const startServer = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initIO(httpServer);

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // Graceful shutdown — stop accepting new connections, drain active ones, then close DB
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed — process exiting");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer();
