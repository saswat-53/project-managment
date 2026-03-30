import { Router } from "express";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  updateWorkspace,
  deleteWorkspace,
  removeWorkspaceMember,
  inviteToWorkspace,
  joinWorkspace,
  updateMemberRole,
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
 *                   type: string
 *                   example: 60d0fe4f5311236168a109ca
 *                 description: Array of user ObjectIds to add as members
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Workspace created successfully
 *                 workspace:
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
 *         description: Workspaces retrieved successfully. Each workspace includes a `myRole` field.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Unauthorized
 */
router.get("/workspaces", verifyJWT, getMyWorkspaces);

/**
 * @swagger
 * /api/workspace/{workspaceId}/members:
 *   get:
 *     summary: Get all members of a workspace
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WorkspaceMember'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this workspace
 *       404:
 *         description: Workspace not found
 */
router.get("/:workspaceId/members", verifyJWT, getWorkspaceMembers);

/**
 * @swagger
 * /api/workspace/{workspaceId}/members/{memberId}:
 *   delete:
 *     summary: Remove a member from a workspace
 *     description: Requires admin or manager role. Managers cannot remove admins. The workspace owner cannot be removed.
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109cb
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member removed successfully
 *       400:
 *         description: Cannot remove the workspace owner
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace or member not found
 */
router.delete("/:workspaceId/members/:memberId", verifyJWT, removeWorkspaceMember);

/**
 * @swagger
 * /api/workspace/{workspaceId}/members/{userId}/role:
 *   put:
 *     summary: Update a member's role in a workspace
 *     description: Requires admin role.
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109cb
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, manager, member]
 *                 example: manager
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member role updated successfully
 *       400:
 *         description: Invalid role value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can change roles
 *       404:
 *         description: Workspace or member not found
 */
router.put("/:workspaceId/members/:userId/role", verifyJWT, updateMemberRole);

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
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workspace not found
 */
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
 *                   type: string
 *                   example: 60d0fe4f5311236168a109ca
 *                 description: Array of user ObjectIds
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Workspace updated successfully
 *                 workspace:
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

/**
 * @swagger
 * /api/workspace/{workspaceId}/invite:
 *   post:
 *     summary: Invite a user to a workspace by email
 *     description: Requires admin or manager role. Returns an invite URL to share.
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         example: 60d0fe4f5311236168a109ca
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newmember@example.com
 *     responses:
 *       200:
 *         description: Invite created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invite created successfully
 *                 inviteUrl:
 *                   type: string
 *                   example: http://localhost:3000/join/abc123xyz
 *                 recipientExists:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: User already a member or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace not found
 */
router.post("/:workspaceId/invite", verifyJWT, inviteToWorkspace);

/**
 * @swagger
 * /api/workspace/join/{token}:
 *   post:
 *     summary: Join a workspace using an invite token
 *     description: The authenticated user's email must match the invited email.
 *     tags: [Workspace]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Invite token from the invite URL
 *     responses:
 *       200:
 *         description: Successfully joined the workspace
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully joined the workspace
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       400:
 *         description: Invite expired, already used, or email mismatch
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid invite link or workspace no longer exists
 */
router.post("/join/:token", verifyJWT, joinWorkspace);

export default router;
