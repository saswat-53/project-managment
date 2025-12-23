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
 * @route   POST /api/task/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post("/tasks", verifyJWT, createTask);

/**
 * @route   GET /api/task/project/:projectId
 * @desc    Get all tasks in a project
 * @access  Private
 */
router.get("/project/:projectId", verifyJWT, getTasksByProject);

/**
 * @route   PUT /api/task/:taskId
 * @desc    Update a task
 * @access  Private
 */
router.put("/:taskId", verifyJWT, updateTask);

/**
 * @route   DELETE /api/task/:taskId
 * @desc    Delete a task
 * @access  Private
 */
router.delete("/:taskId", verifyJWT, deleteTask);

export default router;
