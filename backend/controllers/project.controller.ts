import { Request, Response } from "express";
import { Project } from "../models/project.model";
import { Workspace } from "../models/workspace.model";
import mongoose from "mongoose";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  workspaceIdParamSchema,
} from "../validators/project.validator";
import { getUserWorkspaceRole } from "../utils/workspaceRole";

/**
 * Create Project
 *
 * Creates a new project within a workspace.
 * User must be a member of the workspace to create projects.
 * Creator is automatically added as a project member.
 * Only workspace members can be added as project members.
 * Project is automatically added to workspace's projects array.
 *
 * @route POST /api/project/projects
 * @access Private (requires authentication and workspace membership)
 *
 * Request Body:
 * - name: string (required, validated by Zod)
 * - description: string (optional)
 * - workspaceId: string (required, MongoDB ObjectId)
 * - members: string[] (optional, array of user IDs, must be workspace members)
 * - status: string (optional, "backlog" | "in-progress" | "completed", defaults to "backlog")
 *
 * Response:
 * - 201: Project created successfully with project object
 * - 400: Validation error (name or workspaceId missing, invalid format, or non-workspace members)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Workspace not found
 * - 500: Internal server error
 *
 * @security
 * - Zod validation for request body
 * - Validates workspace exists
 * - Verifies user is a workspace member before allowing project creation
 * - Creator automatically added as project member (cannot be excluded)
 * - Only workspace members can be added as project members
 * - Returns error if any provided user is not a workspace member
 * - Duplicates prevented using Set
 * - Project automatically added to workspace.projects array
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    // Validate request body using Zod schema
    const validation = createProjectSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { name, description, workspaceId, members, status } = validation.data;
    const userId = (req as any).user._id;

    // Check if workspace exists
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only admins and managers can create projects
    const workspaceRole = await getUserWorkspaceRole(userId.toString(), workspaceId);
    if (workspaceRole !== "admin" && workspaceRole !== "manager") {
      return res.status(403).json({
        message: "Only admins and managers can create projects",
      });
    }

    const memberSet = new Set<string>([userId.toString(), ...(members || [])]);
    const workspaceMemberIds = workspace.members.map((id) => id.toString());

    // Check if any provided member is not in the workspace
    const providedMembers = Array.from(memberSet);
    const invalidMembers = providedMembers.filter(
      (memberId: string) => !workspaceMemberIds.includes(memberId)
    );

    if (invalidMembers.length > 0) {
      return res.status(400).json({
        message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users are not members of the workspace.`
      });
    }

    const validMembers = providedMembers;

    // Convert to MongoDB ObjectIds
    const memberObjectIds = validMembers.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const project = await Project.create({
      name,
      description,
      workspace: new mongoose.Types.ObjectId(workspaceId),
      members: memberObjectIds,
      status: status || "backlog",
    });

    workspace.projects.push(project._id);
    await workspace.save();

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Projects by Workspace
 *
 * Retrieves all projects within a specific workspace.
 * User must be a member of the workspace to view its projects.
 *
 * @route GET /api/project/workspace/:workspaceId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - workspaceId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Array of projects with populated members and workspace
 * - 400: Validation error (invalid workspace ID format)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Workspace not found
 * - 500: Internal server error
 *
 * @security
 * - Validates workspace ID using Zod schema
 * - Verifies workspace exists
 * - Checks user is a workspace member before returning projects
 */
export const getProjectsByWorkspace = async (req: Request, res: Response) => {
  try {
    // Validate workspace ID parameter
    const validation = workspaceIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { workspaceId } = validation.data;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((id) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const projects = await Project.find({ workspace: workspaceId })
      .populate("members", "name email")
      .populate("workspace", "name");

    return res.status(200).json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Project by ID
 *
 * Retrieves a specific project by its ID.
 * User must be a member of the project's workspace to view it.
 *
 * @route GET /api/project/:projectId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - projectId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Project object with populated members and workspace
 * - 400: Validation error (invalid project ID format)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Validates project ID using Zod schema
 * - Verifies project exists
 * - Checks user is a workspace member before returning project details
 */
export const getProjectById = async (req: Request, res: Response) => {
  try {
    // Validate project ID parameter
    const validation = projectIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { projectId } = validation.data;
    const userId = (req as any).user._id;

    const project = await Project.findById(projectId)
      .populate("members", "name email role avatarUrl")
      .populate("workspace", "name members");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a member of the workspace
    const workspaceMembers = (project.workspace as any).members.map((m: any) =>
      m.toString()
    );

    if (!workspaceMembers.includes(userId.toString())) {
      return res.status(403).json({ message: "Not authorized" });
    }

    return res.status(200).json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update Project
 *
 * Updates project details. User must be a workspace member to update.
 * All fields are optional for partial updates.
 * Only workspace members can be added as project members.
 * Automatically cleans up stale members who are no longer workspace members.
 *
 * @route PUT /api/project/:projectId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - projectId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Request Body (all optional):
 * - name: string (optional, must not be empty if provided)
 * - description: string (optional)
 * - status: string (optional, "backlog" | "in-progress" | "completed")
 * - members: string[] (optional, array of user IDs, must be workspace members)
 *
 * Response:
 * - 200: Project updated successfully with updated project object
 * - 400: Validation error (invalid ID, body format, or non-workspace members)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Validates both project ID and request body using Zod
 * - Verifies project and workspace exist
 * - Checks user is a workspace member before allowing updates
 * - Only workspace members can be added as project members
 * - Returns error if any provided user is not a workspace member
 * - Members array is ADDITIVE (adds new members to existing ones, no duplicates)
 * - Stale member cleanup automatically handled by Project pre-update hook
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    // Validate project ID parameter
    const paramValidation = projectIdParamSchema.safeParse(req.params);
    // Validate request body
    const bodyValidation = updateProjectSchema.safeParse(req.body);

    if (!paramValidation.success) {
      return res.status(400).json({
        message: paramValidation.error.issues[0].message,
      });
    }

    if (!bodyValidation.success) {
      return res.status(400).json({
        message: bodyValidation.error.issues[0].message,
      });
    }

    const { projectId } = paramValidation.data;
    const { name, description, status, members } = bodyValidation.data;
    const userId = (req as any).user._id;

    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const workspace: any = project.workspace;

    // Check if user is a workspace member (read access)
    const isMember = workspace.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({
        message: "Not authorized to update project",
      });
    }

    // Update fields (stale member cleanup handled by pre-update hook)
    const workspaceMemberIds = workspace.members.map((id: any) => id.toString());
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;

    if (Array.isArray(members)) {
      // Only admins and managers can change project members
      const workspaceRole = await getUserWorkspaceRole(userId.toString(), workspace._id.toString());
      if (workspaceRole !== "admin" && workspaceRole !== "manager") {
        return res.status(403).json({
          message: "Only admins and managers can manage project members",
        });
      }

      // Check if any provided member is not in the workspace
      const invalidMembers = members.filter(
        (memberId: string) => !workspaceMemberIds.includes(memberId)
      );

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users are not members of the workspace.`
        });
      }

      // Get existing members
      const existingMemberIds = project.members.map((id) => id.toString());

      // Add new members to existing ones (additive, no duplicates using Set)
      const combinedMemberSet = new Set<string>([...existingMemberIds, ...members]);
      const newMemberIds = Array.from(combinedMemberSet);

      project.members = newMemberIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    // Restore workspace to ObjectId before saving (it was populated as full object)
    project.workspace = workspace._id;
    await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Remove a member from a project.
 * User must be a workspace member to perform this action.
 * Any workspace member can remove project members (not restricted to owner).
 *
 * @route DELETE /api/project/:projectId/members/:memberId
 * @access Private (workspace member)
 */
export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const { projectId, memberId } = req.params;
    const userId = (req as any).user._id;

    if (
      !mongoose.Types.ObjectId.isValid(projectId) ||
      !mongoose.Types.ObjectId.isValid(memberId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const workspace: any = project.workspace;

    // Only admins and managers can remove project members
    const workspaceRole = await getUserWorkspaceRole(userId.toString(), workspace._id.toString());
    if (workspaceRole !== "admin" && workspaceRole !== "manager") {
      return res.status(403).json({ message: "Only admins and managers can remove project members" });
    }

    const isProjectMember = project.members
      .map((id) => id.toString())
      .includes(memberId);

    if (!isProjectMember) {
      return res.status(404).json({ message: "User is not a member of this project" });
    }

    project.members = project.members.filter((id) => id.toString() !== memberId);
    project.workspace = workspace._id;
    await project.save();

    return res.status(200).json({ message: "Member removed from project successfully" });
  } catch (error) {
    console.error("Remove project member error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a project.
 * User must be a workspace member to delete.
 * Cascade delete automatically handled by Project pre-delete hook.
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    // Validate project ID parameter
    const validation = projectIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { projectId } = validation.data;
    const userId = (req as any).user._id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Fetch workspace for authorization
    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only admins and managers can delete projects
    const workspaceRole = await getUserWorkspaceRole(userId.toString(), workspace._id.toString());
    if (workspaceRole !== "admin" && workspaceRole !== "manager") {
      return res.status(403).json({ message: "Only admins and managers can delete projects" });
    }

    // Cascade delete and workspace cleanup handled by Project pre-delete hook
    await project.deleteOne();

    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
