import { Request, Response } from "express";
import { Workspace, IWorkspace } from "../models/workspace.model";
import { User } from "../models/user.model";
import { Project } from "../models/project.model";
import crypto from "crypto";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
} from "../validators/workspace.validator";
import mongoose from "mongoose";

/**
 * Create Workspace
 *
 * Creates a new workspace with the authenticated user as the owner.
 * Requires owner's email to be verified before allowing workspace creation.
 * Validates workspace name uniqueness per owner and verifies all members exist in database.
 * Owner is automatically added to members array and duplicates are prevented using Set.
 * Generates a unique invite code for workspace sharing.
 *
 * @route POST /api/workspace/workspaces
 * @access Private (requires authentication and email verification)
 *
 * Request Body:
 * - name: string (required, validated by Zod)
 * - description: string (optional)
 * - members: string[] (optional, array of user IDs, validated against DB)
 *
 * Response:
 * - 201: Workspace created successfully with workspace object
 * - 400: Validation error (name required, duplicate name, invalid format, or invalid user IDs)
 * - 403: Email not verified (owner must verify email first)
 * - 404: User not found
 * - 500: Internal server error
 *
 * @security
 * - Requires authenticated user with verified email
 * - Zod validation for request body
 * - Prevents duplicate workspace names per owner
 * - Validates all member IDs exist in User collection
 * - Returns error if any provided user ID doesn't exist
 * - Owner automatically included in members (cannot be excluded)
 * - Duplicates prevented using Set
 * - Unique invite code generated for workspace
 * - Workspace automatically added to all members' workspaces array (bidirectional relationship)
 */
export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const validation = createWorkspaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { name, description, members } = validation.data;
    const ownerId = (req as any).user._id;

    //  Check if the owner's email is verified
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!owner.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before creating a workspace.",
      });
    }

    // ✔ Prevent duplicate workspace name per owner
    const existing = await Workspace.findOne({ name, owner: ownerId });
    if (existing) {
      return res.status(400).json({ message: "Workspace with this name already exists" });
    }

    // ✔ Validate members exist in DB
    let finalMembers: string[] = [];
    if (Array.isArray(members) && members.length > 0) {
      const users = await User.find({ _id: { $in: members } }).select("_id");
      const validIds = users.map(u => u._id.toString());

      // Check if any provided member IDs don't exist in User collection
      const invalidMembers = members.filter(id => !validIds.includes(id));
      if (invalidMembers.length > 0) {
        return res.status(400).json({
          message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users do not exist.`
        });
      }

      finalMembers = validIds;
    }

    // ✔ Ensure owner always included and duplicates removed
    const memberSet = new Set<string>([ownerId, ...finalMembers]);
    const allMembers = Array.from(memberSet).map(id => new mongoose.Types.ObjectId(id));

    const inviteCode = crypto.randomBytes(10).toString("hex");

    const workspace = await Workspace.create({
      name,
      description,
      owner: ownerId,
      members: allMembers,
      inviteCode,
    });

    // Add workspace to all members' workspaces array (bidirectional relationship)
    await User.updateMany(
      { _id: { $in: allMembers } },
      { $addToSet: { workspaces: workspace._id } }
    );

    return res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });

  } catch (error) {
    console.error("Create workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


/**
 * Get All Workspaces
 *
 * Retrieves all workspaces where the authenticated user is a member or owner.
 * Returns workspaces with populated owner and members details (name, email).
 *
 * @route GET /api/workspace/workspaces
 * @access Private (requires authentication)
 *
 * Response:
 * - 200: Array of workspaces with populated owner and members
 * - 500: Internal server error
 *
 * @note Uses MongoDB populate to include user details for owner and members
 */
export const getMyWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;

    const workspaces = await Workspace.find({ members: userId })
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(200).json({ workspaces });
  } catch (error) {
    console.error("Get workspaces error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Single Workspace by ID
 *
 * Retrieves a specific workspace by its ID with populated owner and members.
 * User must be a member of the workspace to view it.
 *
 * @route GET /api/workspace/:workspaceId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - workspaceId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Workspace object with populated owner and members (name, email)
 * - 400: Validation error (invalid workspace ID format)
 * - 403: Not authorized (user is not a workspace member)
 * - 404: Workspace not found
 * - 500: Internal server error
 *
 * @security
 * - Validates workspace ID using Zod schema
 * - Verifies workspace exists
 * - Checks user is a workspace member before returning data
 */
export const getWorkspaceById = async (req: Request, res: Response) => {
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

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((member: any) => member._id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    return res.status(200).json({ workspace });
  } catch (error) {
    console.error("Get workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update Workspace
 *
 * Updates workspace details. Only the workspace owner can perform updates.
 * All fields are optional for partial updates.
 * Validates all member IDs against database before updating.
 * Owner is automatically preserved in members array and cannot be removed.
 *
 * @route PUT /api/workspace/:workspaceId
 * @access Private (requires authentication and ownership)
 *
 * URL Parameters:
 * - workspaceId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Request Body (all optional):
 * - name: string (optional, must not be empty if provided)
 * - description: string (optional)
 * - members: string[] (optional, array of user IDs, validated against DB)
 *
 * Response:
 * - 200: Workspace updated successfully with updated workspace object
 * - 400: Validation error (invalid ID, body format, or invalid user IDs)
 * - 403: Not authorized (user is not the workspace owner)
 * - 404: Workspace not found
 * - 500: Internal server error
 *
 * @security
 * - Validates both workspace ID and request body using Zod
 * - Verifies ownership before allowing updates
 * - Validates all member IDs exist in User collection
 * - Returns error if any provided user ID doesn't exist
 * - Owner cannot be removed from members array (auto-included)
 * - Duplicates prevented using Set
 * - Members array is ADDITIVE (adds new members to existing ones, no duplicates)
 * - Updates users' workspaces arrays when new members are added (bidirectional relationship)
 */
export const updateWorkspace = async (req: Request, res: Response) => {
  try {
    const paramValidation = workspaceIdParamSchema.safeParse(req.params);
    const bodyValidation = updateWorkspaceSchema.safeParse(req.body);

    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.issues[0].message });
    }

    const { workspaceId } = paramValidation.data;
    const { name, description, members } = bodyValidation.data;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only owner can update workspace" });
    }

    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;

    if (Array.isArray(members)) {
      // Validate members exist in DB
      const users = await User.find({ _id: { $in: members } }).select("_id");
      const validIds = users.map(u => u._id.toString());

      // Check if any provided member IDs don't exist in User collection
      const invalidMembers = members.filter(id => !validIds.includes(id));
      if (invalidMembers.length > 0) {
        return res.status(400).json({
          message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users do not exist.`
        });
      }

      // Get existing members
      const existingMemberIds = workspace.members.map(id => id.toString());

      // Add new members to existing ones (additive, no duplicates using Set)
      // Owner is always included
      const combinedMemberSet = new Set<string>([
        workspace.owner.toString(),
        ...existingMemberIds,
        ...validIds
      ]);

      const newMemberIds = Array.from(combinedMemberSet);

      workspace.members = newMemberIds.map(
        id => new mongoose.Types.ObjectId(id)
      );

      // Find only new members to add
      const membersToAdd = newMemberIds.filter(id => !existingMemberIds.includes(id));

      // Add workspace to new members' workspaces array
      if (membersToAdd.length > 0) {
        await User.updateMany(
          { _id: { $in: membersToAdd } },
          { $addToSet: { workspaces: workspace._id } }
        );
      }
    }

    await workspace.save();

    return res.status(200).json({
      message: "Workspace updated successfully",
      workspace,
    });

  } catch (error) {
    console.error("Update workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a workspace.
 * Only the workspace owner can delete.
 * Cascade delete automatically handled by Workspace pre-delete hook.
 */
export const deleteWorkspace = async (req: Request, res: Response) => {
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

    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed to delete" });
    }

    // Cascade delete handled by Workspace pre-delete hook
    await workspace.deleteOne();

    return res
      .status(200)
      .json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Delete workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
