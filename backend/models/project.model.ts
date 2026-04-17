import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  status: "backlog" | "in-progress" | "completed";
  repoUrl?: string;
  /** AES-256-GCM encrypted GitHub PAT — never returned in API responses */
  githubToken?: string;
  workspace: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  tasks: mongoose.Types.ObjectId[];
}

const projectSchema = new Schema<IProject>(
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

    repoUrl: {
      type: String,
      trim: true,
    },

    githubToken: {
      type: String,
      // Stored encrypted — never returned in API responses (stripped in controllers)
    },

    status: {
      type: String,
      enum: ["backlog", "in-progress", "completed"],
      default: "backlog",
    },

    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
  },
  { timestamps: true }
);

// ============================================
// DATABASE INDEXES
// ============================================

projectSchema.index({ workspace: 1 });

// ============================================
// CASCADE DELETE HOOKS
// ============================================

/**
 * Pre-delete hook (document context)
 * Triggered when: await project.deleteOne()
 * Context: 'this' is the project document being deleted
 * Actions:
 * - Deletes all tasks in the project
 * - Removes project from workspace.projects array
 */
projectSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const { withTransaction } = await import("../utils/transaction.utils");

  await withTransaction(async (session) => {
    const { Task } = await import("./task.model");
    const { Workspace } = await import("./workspace.model");

    console.log(`[Project Hook] Cascading delete for project: ${this._id}`);

    const deleteOptions = session ? { session } : {};
    const updateOptions = session ? { session } : {};

    const taskDeleteResult = await Task.deleteMany({ project: this._id }, deleteOptions);
    console.log(`[Project Hook] Deleted ${taskDeleteResult.deletedCount} tasks`);

    await Workspace.updateOne(
      { _id: this.workspace },
      { $pull: { projects: this._id } },
      updateOptions
    );

    console.log(`[Project Hook] Cascade delete completed`);
  });
});

/**
 * Pre-delete hook (query context)
 * Triggered when: await Project.findByIdAndDelete() or Project.deleteOne()
 * Context: 'this' is the query
 * Actions:
 * - Deletes all tasks in the project
 * - Removes project from workspace.projects array
 */
projectSchema.pre("deleteOne", { document: false, query: true }, async function () {
  const { withTransaction } = await import("../utils/transaction.utils");

  await withTransaction(async (session) => {
    const { Task } = await import("./task.model");
    const { Workspace } = await import("./workspace.model");
    const { Project } = await import("./project.model");

    const filter = this.getFilter();
    const findOptions = session ? { session } : {};
    const project = await Project.findOne(filter as any, null, findOptions);
    if (!project) {
      console.log("[Project Hook Query] No project found to delete");
      return;
    }

    console.log(`[Project Hook Query] Cascading delete for project: ${project._id}`);

    const deleteOptions = session ? { session } : {};
    const updateOptions = session ? { session } : {};

    await Task.deleteMany({ project: project._id }, deleteOptions);

    await Workspace.updateOne(
      { _id: project.workspace },
      { $pull: { projects: project._id } },
      updateOptions
    );

    console.log(`[Project Hook Query] Cascade delete completed`);
  });
});

/**
 * Pre-deleteMany hook
 * Triggered when: await Project.deleteMany()
 * Context: 'this' is the query
 * Action: Deletes all tasks in the projects being deleted
 * Note: Workspace cleanup is handled by the caller (Workspace hook) to avoid double-updates
 */
projectSchema.pre("deleteMany", async function () {
  const { Task } = await import("./task.model");
  const { Project } = await import("./project.model");

  const filter = this.getFilter();
  const projects = await Project.find(filter as any);
  const projectIds = projects.map((p) => p._id);

  console.log(`[Project Hook] Bulk deleting ${projectIds.length} projects`);

  const taskDeleteResult = await Task.deleteMany({ project: { $in: projectIds } });
  console.log(`[Project Hook] Deleted ${taskDeleteResult.deletedCount} tasks`);
});

// ============================================
// STALE MEMBER CLEANUP HOOK
// ============================================

/**
 * Pre-update hook for stale member cleanup
 * Triggered when: await Project.findByIdAndUpdate() or Project.findOneAndUpdate()
 * Context: 'this' is the query
 * Actions:
 * - Identifies project members who are no longer workspace members
 * - Removes stale members from project.members array
 * - Unassigns stale members from all tasks in the project
 */
projectSchema.pre("findOneAndUpdate", async function () {
  const { Task } = await import("./task.model");
  const { Workspace } = await import("./workspace.model");
  const { Project } = await import("./project.model");

  const filter = this.getFilter();
  const project = await Project.findOne(filter as any).populate("workspace");
  if (!project || !project.workspace) {
    return;
  }

  const workspace: any = project.workspace;
  const workspaceMemberIds = workspace.members.map((id: any) => id.toString());
  const currentMemberIds = project.members.map((id) => id.toString());

  const staleMembers = currentMemberIds.filter(
    (memberId) => !workspaceMemberIds.includes(memberId)
  );

  if (staleMembers.length > 0) {
    console.log(`[Project Hook] Removing ${staleMembers.length} stale members`);

    const staleMemberObjectIds = staleMembers.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // Add stale member removal to the update operation
    const update = this.getUpdate() as any;
    if (!update.$pull) {
      update.$pull = {};
    }

    // Merge with any existing $pull operations
    if (update.$pull.members) {
      update.$pull.members = {
        $in: [
          ...(Array.isArray(update.$pull.members.$in) ? update.$pull.members.$in : []),
          ...staleMemberObjectIds,
        ],
      };
    } else {
      update.$pull.members = { $in: staleMemberObjectIds };
    }

    this.setUpdate(update);

    // Unassign stale members from all tasks in the project
    const unassignResult = await Task.updateMany(
      { project: project._id, assignedTo: { $in: staleMemberObjectIds } },
      { $unset: { assignedTo: "" } }
    );

    console.log(`[Project Hook] Unassigned ${unassignResult.modifiedCount} tasks`);
  }
});

export const Project = mongoose.model<IProject>("Project", projectSchema);
