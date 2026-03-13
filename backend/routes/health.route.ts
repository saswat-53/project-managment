import { Router } from "express";
import { healthCheck } from "../controllers/health.controller";

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns server liveness and database readiness status.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: All services healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: connected
 *                         healthy:
 *                           type: boolean
 *                           example: true
 *       503:
 *         description: One or more services are unhealthy
 */
router.get("/", healthCheck);

export default router;
