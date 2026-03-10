import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspaceInvite extends Document {
  workspace: mongoose.Types.ObjectId;
  invitedEmail: string;
  invitedBy: mongoose.Types.ObjectId;
  token: string; // SHA256 hashed — raw token is sent in the invite URL
  expiresAt: Date;
  used: boolean;
}

const workspaceInviteSchema = new Schema<IWorkspaceInvite>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    invitedEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Stored as SHA256 hash — the raw token lives only in the invite URL
    token: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-delete expired invites after expiry (MongoDB TTL index)
workspaceInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const WorkspaceInvite = mongoose.model<IWorkspaceInvite>(
  "WorkspaceInvite",
  workspaceInviteSchema
);
