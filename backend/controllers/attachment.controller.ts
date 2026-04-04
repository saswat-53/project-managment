import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import { generatePresignedUploadUrl, deleteR2Object, getPublicUrl } from "../utils/r2";
import { getIO } from "../socket";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Checks that the requesting user is a member of the task's project. */
async function assertProjectMember(task: any, userId: string): Promise<boolean> {
  const project = await Project.findById(task.project);
  if (!project) return false;
  return project.members.some(
    (m: any) => m._id?.toString() === userId || m.toString() === userId
  );
}

/**
 * Step 1 — Presign
 * Validates the file metadata and returns a presigned PUT URL for direct R2 upload.
 *
 * POST /api/task/:taskId/attachments/presign
 * Body: { fileName, fileType, fileSize }
 */
export const presignAttachmentUpload = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { fileName, fileType, fileSize } = req.body;
    const userId = (req as any).user?._id?.toString();

    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ message: "fileName, fileType and fileSize are required." });
    }

    if (!ALLOWED_TYPES.has(fileType)) {
      return res.status(400).json({ message: "File type not allowed." });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({ message: "File exceeds 10 MB limit." });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });

    const isMember = await assertProjectMember(task, userId);
    if (!isMember) return res.status(403).json({ message: "Not a project member." });

    // Build a unique key: attachments/<taskId>/<uuid>/<originalName>
    const ext = fileName.split(".").pop() ?? "";
    const key = `attachments/${taskId}/${randomUUID()}.${ext}`;

    const uploadUrl = await generatePresignedUploadUrl(key, fileType);

    return res.status(200).json({ uploadUrl, key });
  } catch (err) {
    console.error("[presignAttachmentUpload]", err);
    return res.status(500).json({ message: "Failed to generate upload URL." });
  }
};

/**
 * Step 2 — Confirm
 * Called after the browser successfully PUTs the file to R2.
 * Saves the attachment metadata to MongoDB.
 *
 * POST /api/task/:taskId/attachments/confirm
 * Body: { key, fileName, fileType, fileSize }
 */
export const confirmAttachmentUpload = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { key, fileName, fileType, fileSize } = req.body;
    const userId = (req as any).user?._id?.toString();

    if (!key || !fileName || !fileType || !fileSize) {
      return res.status(400).json({ message: "key, fileName, fileType and fileSize are required." });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });

    const isMember = await assertProjectMember(task, userId);
    if (!isMember) return res.status(403).json({ message: "Not a project member." });

    const url = getPublicUrl(key);

    task.attachments.push({
      key,
      fileName,
      fileType,
      fileSize,
      url,
      uploadedBy: userId,
    } as any);

    await task.save();

    // Populate uploader info on the returned attachment
    await task.populate("attachments.uploadedBy", "name avatarUrl");

    const io = getIO();
    io.to(`task:${taskId}`).emit("task:updated", { taskId, task });

    return res.status(201).json({
      message: "Attachment saved.",
      attachment: task.attachments[task.attachments.length - 1],
      task,
    });
  } catch (err) {
    console.error("[confirmAttachmentUpload]", err);
    return res.status(500).json({ message: "Failed to save attachment." });
  }
};

/**
 * Delete an attachment — removes from both R2 and MongoDB.
 * Only the uploader, admins, or managers can delete.
 *
 * DELETE /api/task/:taskId/attachments/:attachmentId
 */
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = (req as any).user?._id?.toString();

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });

    const attachment = task.attachments.find(
      (a) => a._id.toString() === attachmentId
    );
    if (!attachment) return res.status(404).json({ message: "Attachment not found." });

    const isUploader = attachment.uploadedBy.toString() === userId;

    if (!isUploader) {
      // Check workspace role — admins/managers can delete any attachment
      const { getUserWorkspaceRole } = await import("../utils/workspaceRole");
      const role = await getUserWorkspaceRole(userId, task.workspace.toString());
      if (role !== "admin" && role !== "manager") {
        return res.status(403).json({ message: "Not allowed to delete this attachment." });
      }
    }

    // Delete from R2 first — if this fails, don't remove from DB
    await deleteR2Object(attachment.key);

    task.attachments = task.attachments.filter(
      (a) => a._id.toString() !== attachmentId
    ) as any;
    await task.save();

    const io = getIO();
    io.to(`task:${taskId}`).emit("task:updated", { taskId, task });

    return res.status(200).json({ message: "Attachment deleted.", task });
  } catch (err) {
    console.error("[deleteAttachment]", err);
    return res.status(500).json({ message: "Failed to delete attachment." });
  }
};
