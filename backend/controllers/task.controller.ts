import { Request, Response } from "express";
import mongoose from "mongoose";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  projectIdParamSchema,
} from "../validators/task.validator";

/**
 * Recomputes and persists the project status based on its current tasks.
 *
 * Rules (evaluated in priority order):
 *  1. No tasks            → "backlog"
 *  2. All tasks "done"    → "completed"
 *  3. Any task overdue    → "backlog"  (past dueDate and not "done")
 *  4. Otherwise           → "in-progress"
 */
async function recomputeProjectStatus(projectId: mongoose.Types.ObjectId | string) {
  const tasks = await Task.find({ project: projectId }, "status dueDate");

  let newStatus: "backlog" | "in-progress" | "completed";

  if (tasks.length === 0) {
    newStatus = "backlog";
  } else if (tasks.every((t) => t.status === "done")) {
    newStatus = "completed";
  } else {
    const now = new Date();
    const hasOverdue = tasks.some(
      (t) => t.status !== "done" && t.dueDate && t.dueDate < now
    );
    newStatus = hasOverdue ? "backlog" : "in-progress";
  }

  await Project.updateOne({ _id: projectId }, { status: newStatus });
}

/**
 * Create Task
 *
 * Creates a new task within a project.
 * User must be a project member to create tasks.
 * Task creator is automatically set as createdBy.
 * AssignedTo user must be a project member if specified.
 *
 * @route POST /api/task/tasks
 * @access Private (requires authentication and project membership)
 *
 * Request Body:
 * - title: string (required, validated by Zod)
 * - description: string (optional)
 * - projectId: string (required, MongoDB ObjectId)
 * - assignedTo: string (optional, user ID, must be project member)
 * - dueDate: string | Date (optional, ISO datetime string or Date object)
 * - status: string (optional, "todo" | "in-progress" | "done", defaults to "todo")
 *
 * Response:
 * - 201: Task created successfully with task object
 * - 400: Validation error (title or projectId missing, invalid assignee - not a project member)
 * - 403: Not authorized (user not a project member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Zod validation for request body
 * - Validates project exists
 * - Verifies user is a project member before allowing task creation
 * - Validates assignedTo user is a project member if specified
 * - Creator automatically set as createdBy
 * - Task automatically added to project.tasks array (bidirectional relationship)
 */
export const createTask = async (req: Request, res: Response) => {
  try {
    // Validate request body using Zod schema
    const validation = createTaskSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { title, description, projectId, assignedTo, dueDate, status } =
      validation.data;
    const userId = (req as any).user._id;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a project member
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({
        message: "Not authorized. You must be a project member to create tasks.",
      });
    }

    // Validate assigned user is project member (if provided)
    let assignedUserId;
    if (assignedTo) {
      // Check if assignedTo user is a project member
      const isProjectMemberAssignee = project.members
        .map((id: any) => id.toString())
        .includes(assignedTo);

      if (!isProjectMemberAssignee) {
        return res.status(400).json({
          message: "Assigned user must be a project member",
        });
      }

      assignedUserId = new mongoose.Types.ObjectId(assignedTo);
    }

    const task = await Task.create({
      title,
      description,
      project: project._id,
      workspace: project.workspace,
      assignedTo: assignedUserId,
      createdBy: userId,
      dueDate,
      status: status || "todo",
    });

    // Add task to project.tasks array (bidirectional relationship)
    project.tasks.push(task._id);
    await project.save();

    await recomputeProjectStatus(project._id);

    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Tasks by Project
 *
 * Retrieves all tasks within a specific project.
 * User must be a project member to view tasks.
 *
 * @route GET /api/task/project/:projectId
 * @access Private (requires authentication and project membership)
 *
 * URL Parameters:
 * - projectId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Array of tasks with populated assignedTo and createdBy
 * - 400: Validation error (invalid project ID format)
 * - 403: Not authorized (user not a project member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Validates project ID using Zod schema
 * - Verifies project exists
 * - Checks user is a project member before returning tasks
 */
export const getTasksByProject = async (req: Request, res: Response) => {
  try {
    // Validate project ID parameter
    const validation = projectIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { projectId } = validation.data;
    const userId = (req as any).user._id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if user is a project member
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({
        message: "Not authorized. You must be a project member to view tasks.",
      });
    }

    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({ tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update Task
 *
 * Updates task details. User must be a project member to update.
 * All fields are optional for partial updates.
 * AssignedTo user must be a project member if specified.
 *
 * @route PUT /api/task/:taskId
 * @access Private (requires authentication and project membership)
 *
 * URL Parameters:
 * - taskId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Request Body (all optional):
 * - title: string (optional, must not be empty if provided)
 * - description: string (optional)
 * - status: string (optional, "todo" | "in-progress" | "done")
 * - assignedTo: string (optional, user ID, must be project member)
 * - dueDate: string | Date (optional, ISO datetime string or Date object)
 *
 * Response:
 * - 200: Task updated successfully with updated task object
 * - 400: Validation error (invalid ID or body format, invalid assignee - not a project member)
 * - 403: Not authorized (user not a project member)
 * - 404: Task not found
 * - 500: Internal server error
 *
 * @security
 * - Validates both task ID and request body using Zod
 * - Verifies task exists
 * - Checks user is a project member before allowing updates
 * - Validates assignedTo user is a project member if specified
 */
export const updateTask = async (req: Request, res: Response) => {
  try {
    // Validate task ID parameter
    const paramValidation = taskIdParamSchema.safeParse(req.params);
    // Validate request body
    const bodyValidation = updateTaskSchema.safeParse(req.body);

    if (!paramValidation.success) {
      return res.status(400).json({
        message: paramValidation.error.issues[0].message,
      });
    }

    if (!bodyValidation.success) {
      return res.status(400).json({
        message: bodyValidation.error.issues[0].message,
      });
    }

    const { taskId } = paramValidation.data;
    const { title, description, status, assignedTo, dueDate } =
      bodyValidation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project: any = task.project;

    // Check if user is a project member
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({
        message: "Not authorized. You must be a project member to update tasks.",
      });
    }

    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);

    if (assignedTo !== undefined) {
      // Allow null to unassign the task
      if (assignedTo === null) {
        task.assignedTo = undefined;
      } else {
        // Check if assignedTo user is a project member
        const isProjectMemberAssignee = project.members
          .map((id: any) => id.toString())
          .includes(assignedTo);

        if (!isProjectMemberAssignee) {
          return res.status(400).json({
            message: "Assigned user must be a project member",
          });
        }

        task.assignedTo = new mongoose.Types.ObjectId(assignedTo);
      }
    }

    await task.save();

    await recomputeProjectStatus(project._id);

    return res.status(200).json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a task.
 * User must be a project member to delete.
 * Cascade cleanup automatically handled by Task pre-delete hook.
 */
export const deleteTask = async (req: Request, res: Response) => {
  try {
    // Validate task ID parameter
    const validation = taskIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { taskId } = validation.data;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project: any = task.project;

    // Check if user is a project member
    const isProjectMember = project.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isProjectMember) {
      return res.status(403).json({
        message: "Not authorized. You must be a project member to delete tasks.",
      });
    }

    // Project cleanup handled by Task pre-delete hook
    const projectId = project._id;
    await task.deleteOne();

    await recomputeProjectStatus(projectId);

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
