import { z } from "zod";

/**
 * Workspace Validators
 *
 * Zod validation schemas for workspace-related operations.
 * Ensures data integrity and provides clear error messages.
 */

/**
 * Schema for creating a new workspace
 * - name: Required workspace name
 * - description: Optional workspace description
 * - members: Optional array of member user IDs (MongoDB ObjectIds)
 */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  members: z.array(z.string()).optional(),
});

/**
 * Schema for updating workspace details
 * All fields are optional to allow partial updates
 */
export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name cannot be empty").optional(),
  description: z.string().optional(),
  members: z.array(z.string()).optional(),
});

/**
 * Schema for workspace ID parameter validation
 * Used in routes like GET /workspace/:workspaceId
 */
export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
});
