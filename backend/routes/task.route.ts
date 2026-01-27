import { Router } from "express";
import {
  createTask,
  getTasksByProject,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * TASK ROUTES
 * All routes require authentication (verifyJWT middleware)
 */

/**
 * @swagger
 * /api/task/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Task]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - project
 *             properties:
 *               title:
 *                 type: string
 *                 example: Complete the feature
 *               description:
 *                 type: string
 *                 example: Detailed description of the task
 *               project:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109ca
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 60d0fe4f5311236168a109ca
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, completed]
 *                 example: todo
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: medium
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59.999Z
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/tasks", verifyJWT, createTask);

/**
 * @swagger
 * /api/task/project/{projectId}:
 *   get:
 *     summary: Get all tasks in a project
 *     tags: [Task]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get("/project/:projectId", verifyJWT, getTasksByProject);

/**
 * @swagger
 * /api/task/{taskId}:
 *   put:
 *     summary: Update a task
 *     tags: [Task]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated task title
 *               description:
 *                 type: string
 *                 example: Updated description
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 60d0fe4f5311236168a109ca
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, completed]
 *                 example: in_progress
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: high
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59.999Z
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.put("/:taskId", verifyJWT, updateTask);

/**
 * @swagger
 * /api/task/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Task]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.delete("/:taskId", verifyJWT, deleteTask);

export default router;
