import { Router } from "express";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
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
 * @swagger
 * /api/workspace/workspaces:
 *   post:
 *     summary: Create a new workspace
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Workspace
 *               description:
 *                 type: string
 *                 example: Description of my workspace
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: string
 *                       example: 60d0fe4f5311236168a109ca
 *                     role:
 *                       type: string
 *                       enum: [admin, member]
 *                       example: member
 *     responses:
 *       201:
 *         description: Workspace created successfully
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
 *                   example: Workspace created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Workspace'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/workspaces", verifyJWT, createWorkspace);

/**
 * @swagger
 * /api/workspace/workspaces:
 *   get:
 *     summary: Get all workspaces where user is a member or owner
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces retrieved successfully
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
 *                     $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Unauthorized
 */
router.get("/workspaces", verifyJWT, getMyWorkspaces);

/**
 * @swagger
 * /api/workspace/{workspaceId}:
 *   get:
 *     summary: Get a single workspace by ID
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Workspace retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workspace not found
 */
router.get("/:workspaceId/members", verifyJWT, getWorkspaceMembers);
router.get("/:workspaceId", verifyJWT, getWorkspaceById);

/**
 * @swagger
 * /api/workspace/{workspaceId}:
 *   put:
 *     summary: Update a workspace (only owner)
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Workspace Name
 *               description:
 *                 type: string
 *                 example: Updated description
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: string
 *                       example: 60d0fe4f5311236168a109ca
 *                     role:
 *                       type: string
 *                       enum: [admin, member]
 *                       example: member
 *     responses:
 *       200:
 *         description: Workspace updated successfully
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
 *                   example: Workspace updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only owner can update
 *       404:
 *         description: Workspace not found
 */
router.put("/:workspaceId", verifyJWT, updateWorkspace);

/**
 * @swagger
 * /api/workspace/{workspaceId}:
 *   delete:
 *     summary: Delete a workspace (only owner)
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
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
 *                   example: Workspace deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only owner can delete
 *       404:
 *         description: Workspace not found
 */
router.delete("/:workspaceId", verifyJWT, deleteWorkspace);

export default router;
