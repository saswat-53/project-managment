import mongoose from "mongoose";
import { WorkspaceMember, WorkspaceRole } from "../models/workspaceMember.model";
import { Workspace } from "../models/workspace.model";

/**
 * Returns the workspace-level role for a given user.
 *
 * Checks the WorkspaceMember collection first. If no document exists
 * (i.e. the workspace pre-dates the RBAC feature), falls back to:
 *   - owner → "admin"
 *   - any other member → "member"
 *   - not a member → null
 */
export async function getUserWorkspaceRole(
  userId: string | mongoose.Types.ObjectId,
  workspaceId: string | mongoose.Types.ObjectId
): Promise<WorkspaceRole | null> {
  const userIdStr = userId.toString();
  const wsIdStr = workspaceId.toString();

  const memberDoc = await WorkspaceMember.findOne({ user: userIdStr, workspace: wsIdStr });
  if (memberDoc) return memberDoc.role;

  // Migration fallback: derive from Workspace document
  const workspace = await Workspace.findById(wsIdStr).select("owner members");
  if (!workspace) return null;

  const isMember = workspace.members.map((id: any) => id.toString()).includes(userIdStr);
  if (!isMember) return null;

  return workspace.owner.toString() === userIdStr ? "admin" : "member";
}
