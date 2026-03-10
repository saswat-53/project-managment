import mongoose, { Document, Schema } from "mongoose";

export type WorkspaceRole = "admin" | "manager" | "member";

export interface IWorkspaceMember extends Document {
  user: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  role: WorkspaceRole;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
  },
  { timestamps: true }
);

// Ensures one role record per user per workspace
workspaceMemberSchema.index({ user: 1, workspace: 1 }, { unique: true });

export const WorkspaceMember = mongoose.model<IWorkspaceMember>(
  "WorkspaceMember",
  workspaceMemberSchema
);
