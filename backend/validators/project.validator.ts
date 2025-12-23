import { z } from "zod";

/**
 * Project Validators
 *
 * Zod validation schemas for project-related operations.
 * Ensures data integrity and provides clear error messages.
 */

/**
 * Schema for creating a new project
 * - name: Required project name
 * - description: Optional project description
 * - workspaceId: Required workspace ID (MongoDB ObjectId)
 * - members: Optional array of member user IDs (MongoDB ObjectIds)
 * - status: Optional project status (backlog, in-progress, completed)
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  members: z.array(z.string()).optional(),
  status: z.enum(["backlog", "in-progress", "completed"]).optional(),
});

/**
 * Schema for updating project details
 * All fields are optional to allow partial updates
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name cannot be empty").optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "in-progress", "completed"]).optional(),
  members: z.array(z.string()).optional(),
});

/**
 * Schema for project ID parameter validation
 * Used in routes like GET /project/:projectId
 */
export const projectIdParamSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

/**
 * Schema for workspace ID parameter validation
 * Used in routes like GET /project/workspace/:workspaceId
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});
