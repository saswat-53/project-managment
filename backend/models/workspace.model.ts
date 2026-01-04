import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspace extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  projects: mongoose.Types.ObjectId[];
  inviteCode: string;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],

    inviteCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

// ============================================
// CASCADE DELETE HOOKS
// ============================================

/**
 * Pre-delete hook (document context)
 * Triggered when: await workspace.deleteOne()
 * Context: 'this' is the workspace document being deleted
 * Actions:
 * - Deletes all projects in the workspace
 * - Deletes all tasks in those projects
 * - Removes workspace from all members' workspaces arrays
 */
workspaceSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const { withTransaction } = await import("../utils/transaction.utils");

  await withTransaction(async (session) => {
    const { Project } = await import("./project.model");
    const { Task } = await import("./task.model");
    const { User } = await import("./user.model");

    console.log(`[Workspace Hook] Starting cascade delete for workspace: ${this._id}`);

    const findOptions = session ? { session } : {};
    const deleteOptions = session ? { session } : {};
    const updateOptions = session ? { session } : {};

    const projects = await Project.find({ workspace: this._id }, null, findOptions);
    const projectIds = projects.map((p) => p._id);

    console.log(`[Workspace Hook] Found ${projectIds.length} projects to delete`);

    const taskDeleteResult = await Task.deleteMany(
      { project: { $in: projectIds } },
      deleteOptions
    );
    console.log(`[Workspace Hook] Deleted ${taskDeleteResult.deletedCount} tasks`);

    const projectDeleteResult = await Project.deleteMany(
      { workspace: this._id },
      deleteOptions
    );
    console.log(`[Workspace Hook] Deleted ${projectDeleteResult.deletedCount} projects`);

    const userUpdateResult = await User.updateMany(
      { _id: { $in: this.members } },
      { $pull: { workspaces: this._id } },
      updateOptions
    );
    console.log(`[Workspace Hook] Updated ${userUpdateResult.modifiedCount} users`);

    console.log(`[Workspace Hook] Cascade delete completed successfully`);
  });
});

/**
 * Pre-delete hook (query context)
 * Triggered when: await Workspace.findByIdAndDelete() or Workspace.deleteOne()
 * Context: 'this' is the query
 * Actions:
 * - Deletes all projects in the workspace
 * - Deletes all tasks in those projects
 * - Removes workspace from all members' workspaces arrays
 */
workspaceSchema.pre("deleteOne", { document: false, query: true }, async function () {
  const { withTransaction } = await import("../utils/transaction.utils");

  await withTransaction(async (session) => {
    const { Project } = await import("./project.model");
    const { Task } = await import("./task.model");
    const { User } = await import("./user.model");
    const { Workspace } = await import("./workspace.model");

    const filter = this.getFilter();
    const findOptions = session ? { session } : {};
    const workspace = await Workspace.findOne(filter as any, null, findOptions);
    if (!workspace) {
      console.log("[Workspace Hook Query] No workspace found to delete");
      return;
    }

    console.log(`[Workspace Hook Query] Starting cascade delete for workspace: ${workspace._id}`);

    const deleteOptions = session ? { session } : {};
    const updateOptions = session ? { session } : {};

    const projects = await Project.find({ workspace: workspace._id }, null, findOptions);
    const projectIds = projects.map((p) => p._id);

    await Task.deleteMany({ project: { $in: projectIds } }, deleteOptions);
    await Project.deleteMany({ workspace: workspace._id }, deleteOptions);
    await User.updateMany(
      { _id: { $in: workspace.members } },
      { $pull: { workspaces: workspace._id } },
      updateOptions
    );

    console.log(`[Workspace Hook Query] Cascade delete completed`);
  });
});

export const Workspace = mongoose.model<IWorkspace>("Workspace", workspaceSchema);
