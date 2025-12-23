import { Router } from "express";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "../controllers/workspace.controller";

import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * WORKSPACE ROUTES
 * All routes require authentication (verifyJWT middleware)
 */

/**
 * @route   POST /api/workspace
 * @desc    Create a new workspace
 * @access  Private
 */
router.post("/workspaces", verifyJWT, createWorkspace);

/**
 * @route   GET /api/workspace
 * @desc    Get all workspaces where user is a member or owner
 * @access  Private
 */
router.get("/workspaces", verifyJWT, getMyWorkspaces);

/**
 * @route   GET /api/workspace/:workspaceId
 * @desc    Get a single workspace by ID
 * @access  Private
 */
router.get("/:workspaceId", verifyJWT, getWorkspaceById);

/**
 * @route   PUT /api/workspace/:workspaceId
 * @desc    Update a workspace (only owner)
 * @access  Private
 */
router.put("/:workspaceId", verifyJWT, updateWorkspace);

/**
 * @route   DELETE /api/workspace/:workspaceId
 * @desc    Delete a workspace (only owner)
 * @access  Private
 */
router.delete("/:workspaceId", verifyJWT, deleteWorkspace);

export default router;
