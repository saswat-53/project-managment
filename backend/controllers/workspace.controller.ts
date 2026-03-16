import { Request, Response } from "express";
import { Workspace, IWorkspace } from "../models/workspace.model";
import { WorkspaceInvite } from "../models/workspaceInvite.model";
import { WorkspaceMember } from "../models/workspaceMember.model";
import { User } from "../models/user.model";
import { Project } from "../models/project.model";
import crypto from "crypto";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  inviteToWorkspaceSchema,
  joinTokenParamSchema,
} from "../validators/workspace.validator";
import mongoose from "mongoose";
import { getUserWorkspaceRole } from "../utils/workspaceRole";
import {
  sendWorkspaceInviteEmail,
  sendRoleChangedEmail,
  sendRemovedFromWorkspaceEmail,
} from "../utils/email.service";

/**
 * Create Workspace
 *
 * Creates a new workspace with the authenticated user as the owner.
 * Requires owner's email to be verified before allowing workspace creation.
 * Seeds a WorkspaceMember record for the owner (role: "admin") and any
 * initial members (role: "member").
 *
 * @route POST /api/workspace/workspaces
 * @access Private (requires authentication and email verification)
 */
export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const validation = createWorkspaceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { name, description, members } = validation.data;
    const ownerId = (req as any).user._id;

    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!owner.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before creating a workspace.",
      });
    }

    const existing = await Workspace.findOne({ name, owner: ownerId });
    if (existing) {
      return res.status(400).json({ message: "Workspace with this name already exists" });
    }

    let finalMembers: string[] = [];
    if (Array.isArray(members) && members.length > 0) {
      const users = await User.find({ _id: { $in: members } }).select("_id");
      const validIds = users.map(u => u._id.toString());

      const invalidMembers = members.filter(id => !validIds.includes(id));
      if (invalidMembers.length > 0) {
        return res.status(400).json({
          message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users do not exist.`
        });
      }

      finalMembers = validIds;
    }

    const memberSet = new Set<string>([ownerId.toString(), ...finalMembers]);
    const allMembers = Array.from(memberSet).map(id => new mongoose.Types.ObjectId(id));

    const inviteCode = crypto.randomBytes(10).toString("hex");

    const workspace = await Workspace.create({
      name,
      description,
      owner: ownerId,
      members: allMembers,
      inviteCode,
    });

    // Bidirectional: add workspace to all members' workspaces array
    await User.updateMany(
      { _id: { $in: allMembers } },
      { $addToSet: { workspaces: workspace._id } }
    );

    // Seed WorkspaceMember records — owner gets "admin", others get "member"
    const ownerIdStr = ownerId.toString();
    const memberRoleDocs = allMembers.map(memberId => ({
      user: memberId,
      workspace: workspace._id,
      role: memberId.toString() === ownerIdStr ? "admin" : "member",
    }));
    await WorkspaceMember.insertMany(memberRoleDocs, { ordered: false }).catch(() => {
      // Ignore duplicate key errors (upsert-like behavior)
    });

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
 * Retrieves all workspaces where the authenticated user is a member.
 * Each workspace includes the current user's workspace role (myRole) for UI gating.
 *
 * @route GET /api/workspace/workspaces
 * @access Private (requires authentication)
 */
export const getMyWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const userIdStr = userId.toString();

    const workspaces = await Workspace.find({ members: userId })
      .populate("owner", "name email")
      .populate("members", "name email");

    // Fetch all WorkspaceMember docs for this user in one query
    const workspaceIds = workspaces.map(ws => ws._id);
    const memberDocs = await WorkspaceMember.find({
      user: userId,
      workspace: { $in: workspaceIds },
    });
    const roleMap = new Map(memberDocs.map(m => [m.workspace.toString(), m.role]));

    // Augment each workspace with the current user's role (fallback: owner=admin, else member)
    const workspacesWithRole = workspaces.map(ws => {
      const wsObj = ws.toObject();
      const ownerId = typeof wsObj.owner === "object" && wsObj.owner !== null
        ? (wsObj.owner as any)._id?.toString()
        : (wsObj.owner as any)?.toString();
      const myRole = roleMap.get(ws._id.toString())
        ?? (ownerId === userIdStr ? "admin" : "member");
      return { ...wsObj, myRole };
    });

    return res.status(200).json({ workspaces: workspacesWithRole });
  } catch (error) {
    console.error("Get workspaces error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Single Workspace by ID
 *
 * @route GET /api/workspace/:workspaceId
 * @access Private (requires authentication and workspace membership)
 */
export const getWorkspaceById = async (req: Request, res: Response) => {
  try {
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
 *
 * @route PUT /api/workspace/:workspaceId
 * @access Private (requires authentication and ownership)
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
      const users = await User.find({ _id: { $in: members } }).select("_id");
      const validIds = users.map(u => u._id.toString());

      const invalidMembers = members.filter(id => !validIds.includes(id));
      if (invalidMembers.length > 0) {
        return res.status(400).json({
          message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users do not exist.`
        });
      }

      const existingMemberIds = workspace.members.map(id => id.toString());

      const combinedMemberSet = new Set<string>([
        workspace.owner.toString(),
        ...existingMemberIds,
        ...validIds
      ]);

      const newMemberIds = Array.from(combinedMemberSet);

      workspace.members = newMemberIds.map(
        id => new mongoose.Types.ObjectId(id)
      );

      const membersToAdd = newMemberIds.filter(id => !existingMemberIds.includes(id));

      if (membersToAdd.length > 0) {
        await User.updateMany(
          { _id: { $in: membersToAdd } },
          { $addToSet: { workspaces: workspace._id } }
        );

        // Seed WorkspaceMember docs for newly added members (default role: member)
        const newMemberDocs = membersToAdd.map(id => ({
          user: id,
          workspace: workspace._id,
          role: "member",
        }));
        await WorkspaceMember.insertMany(newMemberDocs, { ordered: false }).catch(() => {});
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
 * Get Workspace Members
 *
 * Retrieves all members with their profile details AND their workspace role.
 * The workspaceRole field enables per-workspace RBAC in the frontend.
 *
 * @route GET /api/workspace/:workspaceId/members
 * @access Private (requires authentication and workspace membership)
 */
export const getWorkspaceMembers = async (req: Request, res: Response) => {
  try {
    const validation = workspaceIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { workspaceId } = validation.data;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isMember = workspace.members
      .map((id) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const members = await User.find({ _id: { $in: workspace.members } })
      .select("_id name email avatarUrl role position");

    // Join with WorkspaceMember to get per-workspace roles
    const memberDocs = await WorkspaceMember.find({ workspace: workspaceId });
    const roleMap = new Map(memberDocs.map(m => [m.user.toString(), m.role]));

    const ownerIdStr = workspace.owner.toString();
    const membersWithRole = members.map(m => ({
      ...m.toObject(),
      workspaceRole: roleMap.get(m._id.toString())
        ?? (m._id.toString() === ownerIdStr ? "admin" : "member"),
    }));

    return res.status(200).json({ success: true, data: membersWithRole });
  } catch (error) {
    console.error("Get workspace members error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Invite a user to a workspace.
 * Admins and managers can send invites.
 *
 * @route POST /api/workspace/:workspaceId/invite
 * @access Private (admin or manager)
 */
export const inviteToWorkspace = async (req: Request, res: Response) => {
  try {
    const paramValidation = workspaceIdParamSchema.safeParse(req.params);
    const bodyValidation = inviteToWorkspaceSchema.safeParse(req.body);

    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.issues[0].message });
    }

    const { workspaceId } = paramValidation.data;
    const { email } = bodyValidation.data;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only admins and managers can invite
    const requesterRole = await getUserWorkspaceRole(userId.toString(), workspaceId);
    if (requesterRole !== "admin" && requesterRole !== "manager") {
      return res.status(403).json({ message: "Only admins and managers can send invites" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).select("_id");
    if (existingUser) {
      const isAlreadyMember = workspace.members
        .map((id) => id.toString())
        .includes(existingUser._id.toString());

      if (isAlreadyMember) {
        return res.status(400).json({ message: "This user is already a workspace member" });
      }
    }

    await WorkspaceInvite.deleteOne({
      workspace: workspaceId,
      invitedEmail: email.toLowerCase(),
      used: false,
    });

    const rawToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await WorkspaceInvite.create({
      workspace: workspaceId,
      invitedEmail: email.toLowerCase(),
      invitedBy: userId,
      token: hashedToken,
      expiresAt,
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/workspace/join/${rawToken}`;

    sendWorkspaceInviteEmail(email.toLowerCase(), workspace.name, inviteUrl).catch((err) =>
      console.error("Failed to send workspace invite email:", err)
    );

    return res.status(200).json({
      message: "Invite sent successfully",
      recipientExists: !!existingUser,
      // DEV ONLY: returned for manual testing — removed in production
      ...(process.env.NODE_ENV !== "production" && { inviteUrl }),
    });
  } catch (error) {
    console.error("Invite to workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Join a workspace via invite token.
 * Creates a WorkspaceMember record with role "member" for the joining user.
 *
 * @route POST /api/workspace/join/:token
 * @access Private (requires authentication)
 */
export const joinWorkspace = async (req: Request, res: Response) => {
  try {
    const validation = joinTokenParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { token: rawToken } = validation.data;
    const userId = (req as any).user._id;

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invite = await WorkspaceInvite.findOne({ token: hashedToken });
    if (!invite) {
      return res.status(404).json({ message: "Invalid invite link" });
    }

    if (invite.used) {
      return res.status(400).json({ message: "This invite link has already been used" });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ message: "This invite link has expired" });
    }

    const user = await User.findById(userId).select("email");
    if (!user || user.email.toLowerCase() !== invite.invitedEmail) {
      return res.status(400).json({
        message: "This invite was sent to a different email address",
      });
    }

    const workspace = await Workspace.findById(invite.workspace);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace no longer exists" });
    }

    const isAlreadyMember = workspace.members
      .map((id) => id.toString())
      .includes(userId.toString());

    if (isAlreadyMember) {
      invite.used = true;
      await invite.save();
      return res.status(200).json({ message: "You are already a member of this workspace", workspace });
    }

    workspace.members.push(new mongoose.Types.ObjectId(userId));
    await workspace.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { workspaces: workspace._id } });

    // Create WorkspaceMember record with default "member" role
    await WorkspaceMember.findOneAndUpdate(
      { user: userId, workspace: workspace._id },
      { role: "member" },
      { upsert: true, new: true }
    );

    invite.used = true;
    await invite.save();

    return res.status(200).json({
      message: "Successfully joined the workspace",
      workspace,
    });
  } catch (error) {
    console.error("Join workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Remove a member from a workspace.
 * Admins and managers can remove members.
 * Managers cannot remove admins.
 * The workspace owner cannot be removed.
 * Also cleans up the WorkspaceMember record.
 *
 * @route DELETE /api/workspace/:workspaceId/members/:memberId
 * @access Private (admin or manager)
 */
export const removeWorkspaceMember = async (req: Request, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const userId = (req as any).user._id;

    if (
      !mongoose.Types.ObjectId.isValid(workspaceId) ||
      !mongoose.Types.ObjectId.isValid(memberId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only admins and managers can remove members
    const requesterRole = await getUserWorkspaceRole(userId.toString(), workspaceId);
    if (requesterRole !== "admin" && requesterRole !== "manager") {
      return res.status(403).json({ message: "Only admins and managers can remove members" });
    }

    // The workspace owner can never be removed
    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({ message: "Cannot remove the workspace owner" });
    }

    // Managers cannot remove admins
    if (requesterRole === "manager") {
      const targetRole = await getUserWorkspaceRole(memberId, workspaceId);
      if (targetRole === "admin") {
        return res.status(403).json({ message: "Managers cannot remove admins" });
      }
    }

    const isMember = workspace.members.map((id) => id.toString()).includes(memberId);
    if (!isMember) {
      return res.status(404).json({ message: "User is not a member of this workspace" });
    }

    workspace.members = workspace.members.filter((id) => id.toString() !== memberId);
    await workspace.save();

    await User.findByIdAndUpdate(memberId, { $pull: { workspaces: workspace._id } });

    // Clean up WorkspaceMember record
    await WorkspaceMember.deleteOne({ user: memberId, workspace: workspaceId });

    // Notify the removed member (fire-and-forget)
    User.findById(memberId).select("email").then((removedUser) => {
      if (removedUser) {
        sendRemovedFromWorkspaceEmail(removedUser.email, workspace.name).catch((err) =>
          console.error("Failed to send workspace removal email:", err)
        );
      }
    }).catch(() => {});

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Remove workspace member error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a workspace.
 * Only workspace admins can delete.
 * Cascade delete automatically handled by Workspace pre-delete hook.
 *
 * @route DELETE /api/workspace/:workspaceId
 * @access Private (admin only)
 */
export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
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

    // Only admins can delete a workspace
    const requesterRole = await getUserWorkspaceRole(userId.toString(), workspaceId);
    if (requesterRole !== "admin") {
      return res.status(403).json({ message: "Only admins can delete workspaces" });
    }

    await workspace.deleteOne();

    return res
      .status(200)
      .json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Delete workspace error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update a member's workspace role.
 * Only workspace admins can change roles.
 *
 * @route PUT /api/workspace/:workspaceId/members/:userId/role
 * @access Private (admin only)
 */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const requesterId = (req as any).user._id.toString();

    if (
      !mongoose.Types.ObjectId.isValid(workspaceId) ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    if (!["admin", "manager", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be admin, manager, or member." });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only admins can change member roles
    const requesterRole = await getUserWorkspaceRole(requesterId, workspaceId);
    if (requesterRole !== "admin") {
      return res.status(403).json({ message: "Only admins can change member roles" });
    }

    // Target must be a workspace member
    const isMember = workspace.members.map(id => id.toString()).includes(targetUserId);
    if (!isMember) {
      return res.status(404).json({ message: "User is not a workspace member" });
    }

    // Upsert the WorkspaceMember role
    await WorkspaceMember.findOneAndUpdate(
      { user: targetUserId, workspace: workspaceId },
      { role },
      { upsert: true, new: true }
    );

    // Notify the affected member of their new role (fire-and-forget)
    User.findById(targetUserId).select("email").then((targetUser) => {
      if (targetUser) {
        sendRoleChangedEmail(targetUser.email, role, workspace.name).catch((err) =>
          console.error("Failed to send role changed email:", err)
        );
      }
    }).catch(() => {});

    return res.status(200).json({ message: "Member role updated successfully" });
  } catch (error) {
    console.error("Update member role error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
