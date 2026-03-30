import { Request, Response } from "express";
import mongoose from "mongoose";

// mongoose readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * GET /api/health
 * Liveness + readiness check.
 * Returns 200 if everything is healthy, 503 if DB is not connected.
 */
export const healthCheck = (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = DB_STATES[dbState] ?? "unknown";
  const isHealthy = dbState === 1;

  const payload = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services: {
      database: {
        status: dbStatus,
        healthy: isHealthy,
      },
    },
  };

  res.status(isHealthy ? 200 : 503).json(payload);
};
