import mongoose, { Schema, Document } from "mongoose";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface IReply {
  _id: mongoose.Types.ObjectId;
  text: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IComment {
  _id: mongoose.Types.ObjectId;
  text: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  replies: IReply[];
}

export interface IAttachment {
  _id: mongoose.Types.ObjectId;
  key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  project: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  comments: IComment[];
  attachments: IAttachment[];
  planMarkdown?: string;
  planGeneratedAt?: Date;
  planDuration?: number;
  planUrl?: string;
  executionStatus?: "idle" | "running" | "pr_opened" | "failed" | "cancelled";
  prUrl?: string;
  executionLog?: string;
  executionStartedAt?: Date;
}

// Reply schema — same shape as a comment but intentionally has no `replies` field
// This enforces the 2-level limit at the schema level
const replySchema = new Schema<IReply>(
  {
    text: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const commentSchema = new Schema<IComment>(
  {
    text: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const attachmentSchema = new Schema<IAttachment>(
  {
    key: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
    },

    comments: {
      type: [commentSchema],
      default: [],
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    planMarkdown: {
      type: String,
    },

    planGeneratedAt: {
      type: Date,
    },

    planDuration: {
      type: Number,
    },

    planUrl: {
      type: String,
    },

    executionStatus: {
      type: String,
      enum: ["idle", "running", "pr_opened", "failed", "cancelled"],
    },

    prUrl: {
      type: String,
    },

    executionLog: {
      type: String,
    },

    executionStartedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ============================================
// DATABASE INDEXES
// ============================================

taskSchema.index({ project: 1 });
taskSchema.index({ workspace: 1 });

// ============================================
// CASCADE DELETE HOOKS
// ============================================

/**
 * Pre-delete hook (document context)
 * Triggered when: await task.deleteOne()
 * Context: 'this' is the task document being deleted
 * Action: Removes task from project.tasks array + deletes all R2 objects (attachments + plan)
 */
taskSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const { Project } = await import("./project.model");
  const { deleteR2Object } = await import("../utils/r2");

  await Project.updateOne({ _id: this.project }, { $pull: { tasks: this._id } });

  // Delete all file attachments from R2
  const r2Deletes = this.attachments.map((a) => deleteR2Object(a.key).catch(() => {}));

  // Delete the AI plan markdown from R2 if it was uploaded
  if (this.planUrl) {
    r2Deletes.push(deleteR2Object(`plans/${this._id}.md`).catch(() => {}));
  }

  await Promise.all(r2Deletes);
});

/**
 * Pre-delete hook (query context)
 * Triggered when: await Task.findByIdAndDelete() or Task.deleteOne()
 * Context: 'this' is the query
 * Action: Removes task from project.tasks array
 */
taskSchema.pre("deleteOne", { document: false, query: true }, async function () {
  const { Project } = await import("./project.model");
  const { Task } = await import("./task.model");

  const filter = this.getFilter();
  const task = await Task.findOne(filter as any);
  if (!task) {
    console.log("[Task Hook Query] No task found to delete");
    return;
  }

  // console.log(`[Task Hook Query] Removing task ${task._id} from project`);

  await Project.updateOne({ _id: task.project }, { $pull: { tasks: task._id } });
});

/**
 * Pre-deleteMany hook
 * Triggered when: await Task.deleteMany()
 * Context: 'this' is the query
 * Note: Project cleanup is handled by the caller (Project hook) to avoid N queries
 */
taskSchema.pre("deleteMany", async function () {
  const { Task } = await import("./task.model");
  const { deleteR2Object } = await import("../utils/r2");

  const filter = this.getFilter();
  const tasks = await Task.find(filter as any).select("attachments planUrl _id");

  // Delete all R2 objects for every task being bulk-deleted
  const r2Deletes = tasks.flatMap((task) => [
    ...task.attachments.map((a) => deleteR2Object(a.key).catch(() => {})),
    ...(task.planUrl ? [deleteR2Object(`plans/${task._id}.md`).catch(() => {})] : []),
  ]);

  await Promise.all(r2Deletes);

  // Project cleanup handled by caller to avoid N queries
});

export const Task = mongoose.model<ITask>("Task", taskSchema);
