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
 * Action: Removes task from project.tasks array
 */
taskSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const { Project } = await import("./project.model");

  // console.log(`[Task Hook] Removing task ${this._id} from project`);

  await Project.updateOne({ _id: this.project }, { $pull: { tasks: this._id } });
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

  const filter = this.getFilter();
  const tasks = await Task.find(filter as any);
  // console.log(`[Task Hook] Bulk deleting ${tasks.length} tasks`);

  // Project cleanup handled by caller to avoid N queries
});

export const Task = mongoose.model<ITask>("Task", taskSchema);
