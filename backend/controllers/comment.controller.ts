import { Request, Response } from "express";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import {
  addCommentSchema,
  editCommentSchema,
  commentIdParamSchema,
  replyIdParamSchema,
  taskIdParamSchema,
} from "../validators/task.validator";
import { getUserWorkspaceRole } from "../utils/workspaceRole";
import { getIO } from "../socket";

/**
 * Add Comment to Task
 *
 * Appends a new comment to a task's comments array.
 * Any project member can comment (broader than task edit permissions).
 * Author is always set server-side from the authenticated user.
 *
 * @route POST /api/task/:taskId/comments
 * @access Private (requires authentication and project membership)
 */
export const addComment = async (req: Request, res: Response) => {
  try {
    const paramValidation = taskIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }

    const bodyValidation = addCommentSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.issues[0].message });
    }

    const { taskId } = paramValidation.data;
    const { text } = bodyValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project: any = task.project;

    // Any project member can comment
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({ message: "You must be a project member to comment." });
    }

    task.comments.push({ text, author: userId } as any);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl");

    getIO().to(`project:${project._id.toString()}`).emit("task:updated", { task: populatedTask });

    return res.status(201).json({
      message: "Comment added",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete Comment from Task
 *
 * Removes a comment from a task's comments array.
 * Allowed: comment author, workspace admin, workspace manager.
 *
 * @route DELETE /api/task/:taskId/comments/:commentId
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const paramValidation = commentIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }

    const { taskId, commentId } = paramValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const comment = task.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isAuthor = comment.author.toString() === userId.toString();
    const workspaceRole = await getUserWorkspaceRole(userId.toString(), task.workspace.toString());
    const isAdminOrManager = workspaceRole === "admin" || workspaceRole === "manager";

    if (!isAuthor && !isAdminOrManager) {
      return res.status(403).json({ message: "Not authorized to delete this comment." });
    }

    task.comments = task.comments.filter((c) => c._id.toString() !== commentId) as any;
    await task.save();

    const project: any = task.project;
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl");

    getIO().to(`project:${project._id.toString()}`).emit("task:updated", { task: populatedTask });

    return res.status(200).json({ message: "Comment deleted", task: populatedTask });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Edit Comment on Task
 *
 * Updates the text of an existing comment.
 * Only the comment author can edit their own comment.
 *
 * @route PUT /api/task/:taskId/comments/:commentId
 */
export const editComment = async (req: Request, res: Response) => {
  try {
    const paramValidation = commentIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }

    const bodyValidation = editCommentSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.issues[0].message });
    }

    const { taskId, commentId } = paramValidation.data;
    const { text } = bodyValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const comment = task.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the comment author can edit it." });
    }

    comment.text = text;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl");

    getIO().to(`project:${task.project.toString()}`).emit("task:updated", { task: populatedTask });

    return res.status(200).json({ message: "Comment updated", task: populatedTask });
  } catch (error) {
    console.error("Edit comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Add Reply to Comment
 *
 * Appends a reply to a specific comment's replies array.
 * Any project member can reply.
 *
 * @route POST /api/task/:taskId/comments/:commentId/replies
 */
export const addReply = async (req: Request, res: Response) => {
  try {
    const paramValidation = commentIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }

    const bodyValidation = addCommentSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.issues[0].message });
    }

    const { taskId, commentId } = paramValidation.data;
    const { text } = bodyValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project: any = task.project;
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({ message: "You must be a project member to reply." });
    }

    const comment = task.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    comment.replies.push({ text, author: userId } as any);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl");

    getIO().to(`project:${project._id.toString()}`).emit("task:updated", { task: populatedTask });

    return res.status(201).json({ message: "Reply added", task: populatedTask });
  } catch (error) {
    console.error("Add reply error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete Reply from Comment
 *
 * Removes a reply from a comment's replies array.
 * Allowed: reply author, workspace admin, workspace manager.
 *
 * @route DELETE /api/task/:taskId/comments/:commentId/replies/:replyId
 */
export const deleteReply = async (req: Request, res: Response) => {
  try {
    const paramValidation = replyIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.issues[0].message });
    }

    const { taskId, commentId, replyId } = paramValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const comment = task.comments.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.find((r) => r._id.toString() === replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    const isAuthor = reply.author.toString() === userId.toString();
    const workspaceRole = await getUserWorkspaceRole(userId.toString(), task.workspace.toString());
    const isAdminOrManager = workspaceRole === "admin" || workspaceRole === "manager";

    if (!isAuthor && !isAdminOrManager) {
      return res.status(403).json({ message: "Not authorized to delete this reply." });
    }

    comment.replies = comment.replies.filter((r) => r._id.toString() !== replyId) as any;
    await task.save();

    const project: any = task.project;
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl");

    getIO().to(`project:${project._id.toString()}`).emit("task:updated", { task: populatedTask });

    return res.status(200).json({ message: "Reply deleted", task: populatedTask });
  } catch (error) {
    console.error("Delete reply error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
