import { Router } from "express";
import {
  createProject,
  getProjectsByWorkspace,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";
import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * PROJECT ROUTES
 * All routes require authentication (verifyJWT middleware)
 */

/**
 * @route   POST /api/project/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post("/projects", verifyJWT, createProject);

/**
 * @route   GET /api/project/workspace/:workspaceId
 * @desc    Get all projects in a workspace
 * @access  Private
 */
router.get("/workspace/:workspaceId", verifyJWT, getProjectsByWorkspace);

/**
 * @route   GET /api/project/:projectId
 * @desc    Get a single project by ID
 * @access  Private
 */
router.get("/:projectId", verifyJWT, getProjectById);

/**
 * @route   PUT /api/project/:projectId
 * @desc    Update a project
 * @access  Private
 */
router.put("/:projectId", verifyJWT, updateProject);

/**
 * @route   DELETE /api/project/:projectId
 * @desc    Delete a project
 * @access  Private
 */
router.delete("/:projectId", verifyJWT, deleteProject);

export default router;
