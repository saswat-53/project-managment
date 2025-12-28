import { z } from "zod";

/**
 * Task Validators
 *
 * Zod validation schemas for task-related operations.
 * Ensures data integrity and provides clear error messages.
 */

/**
 * Schema for creating a new task
 * - title: Required task title
 * - description: Optional task description
 * - projectId: Required project ID (MongoDB ObjectId)
 * - assignedTo: Optional user ID to assign task to (MongoDB ObjectId)
 * - dueDate: Optional due date (ISO string)
 * - status: Optional task status (todo, in-progress, done)
 */
export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  projectId: z.string().min(1, "Project ID is required"),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
});

/**
 * Schema for updating task details
 * All fields are optional to allow partial updates
 * assignedTo can be null to unassign the task
 */
export const updateTaskSchema = z.object({
  title: z.string().min(1, "Task title cannot be empty").optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "done"]).optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
});

/**
 * Schema for task ID parameter validation
 * Used in routes like GET /task/:taskId
 */
export const taskIdParamSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
});

/**
 * Schema for project ID parameter validation
 * Used in routes like GET /task/project/:projectId
 */
export const projectIdParamSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});
