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
 * @swagger
 * /api/project/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Project]
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
 *               - workspace
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Project
 *               description:
 *                 type: string
 *                 example: Description of my project
 *               workspace:
 *                 type: string
 *                 example: 60d0fe4f5311236168a109ca
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
 *               status:
 *                 type: string
 *                 enum: [active, archived, completed]
 *                 example: active
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-01-01T00:00:00.000Z
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59.999Z
 *     responses:
 *       201:
 *         description: Project created successfully
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
 *                   example: Project created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/projects", verifyJWT, createProject);

/**
 * @swagger
 * /api/project/workspace/{workspaceId}:
 *   get:
 *     summary: Get all projects in a workspace
 *     tags: [Project]
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
 *         description: Projects retrieved successfully
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
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workspace not found
 */
router.get("/workspace/:workspaceId", verifyJWT, getProjectsByWorkspace);

/**
 * @swagger
 * /api/project/{projectId}:
 *   get:
 *     summary: Get a single project by ID
 *     tags: [Project]
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
 *         description: Project retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get("/:projectId", verifyJWT, getProjectById);

/**
 * @swagger
 * /api/project/{projectId}:
 *   put:
 *     summary: Update a project
 *     tags: [Project]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Project Name
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
 *               status:
 *                 type: string
 *                 enum: [active, archived, completed]
 *                 example: active
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-01-01T00:00:00.000Z
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-31T23:59:59.999Z
 *     responses:
 *       200:
 *         description: Project updated successfully
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
 *                   example: Project updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.put("/:projectId", verifyJWT, updateProject);

/**
 * @swagger
 * /api/project/{projectId}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Project]
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
 *         description: Project deleted successfully
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
 *                   example: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.delete("/:projectId", verifyJWT, deleteProject);

export default router;
