import { Request, Response } from "express";
import mongoose from "mongoose";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import { Workspace } from "../models/workspace.model";
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
  projectIdParamSchema,
} from "../validators/task.validator";

/**
 * Create Task
 *
 * Creates a new task within a project.
 * User must be a workspace member to create tasks.
 * Task creator is automatically set as createdBy.
 * AssignedTo user must be a workspace member if specified.
 *
 * @route POST /api/task/tasks
 * @access Private (requires authentication and workspace membership)
 *
 * Request Body:
 * - title: string (required, validated by Zod)
 * - description: string (optional)
 * - projectId: string (required, MongoDB ObjectId)
 * - assignedTo: string (optional, user ID, must be workspace member)
 * - dueDate: string | Date (optional, ISO datetime string or Date object)
 * - status: string (optional, "todo" | "in-progress" | "done", defaults to "todo")
 *
 * Response:
 * - 201: Task created successfully with task object
 * - 400: Validation error (title or projectId missing, invalid assignee)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Zod validation for request body
 * - Validates project exists
 * - Verifies user is a workspace member before allowing task creation
 * - Validates assignedTo user is a workspace member if specified
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
    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const workspace: any = project.workspace;

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Validate assigned user is workspace member (if provided)
    let assignedUserId;
    if (assignedTo) {
      const isValidAssignee = workspace.members
        .map((id: any) => id.toString())
        .includes(assignedTo);

      if (!isValidAssignee) {
        return res.status(400).json({
          message: "Assigned user must be workspace member",
        });
      }

      assignedUserId = new mongoose.Types.ObjectId(assignedTo);
    }

    const task = await Task.create({
      title,
      description,
      project: project._id,
      workspace: workspace._id,
      assignedTo: assignedUserId,
      createdBy: userId,
      dueDate,
      status: status || "todo",
    });

    // Add task to project.tasks array (bidirectional relationship)
    project.tasks.push(task._id);
    await project.save();

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
 * User must be a workspace member to view project tasks.
 *
 * @route GET /api/task/project/:projectId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - projectId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Array of tasks with populated assignedTo and createdBy
 * - 400: Validation error (invalid project ID format)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Validates project ID using Zod schema
 * - Verifies project exists
 * - Checks user is a workspace member before returning tasks
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

    const project = await Project.findById(projectId).populate("workspace");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const workspace: any = project.workspace;

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
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
 * Updates task details. User must be a workspace member to update.
 * All fields are optional for partial updates.
 * AssignedTo user must be a workspace member if specified.
 *
 * @route PUT /api/task/:taskId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - taskId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Request Body (all optional):
 * - title: string (optional, must not be empty if provided)
 * - description: string (optional)
 * - status: string (optional, "todo" | "in-progress" | "done")
 * - assignedTo: string (optional, user ID, must be workspace member)
 * - dueDate: string | Date (optional, ISO datetime string or Date object)
 *
 * Response:
 * - 200: Task updated successfully with updated task object
 * - 400: Validation error (invalid ID or body format, invalid assignee)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Task not found
 * - 500: Internal server error
 *
 * @security
 * - Validates both task ID and request body using Zod
 * - Verifies task and workspace exist
 * - Checks user is a workspace member before allowing updates
 * - Validates assignedTo user is a workspace member if specified
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

    const task = await Task.findById(taskId).populate("workspace");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const workspace: any = task.workspace;

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);

    if (assignedTo !== undefined) {
      const isValidAssignee = workspace.members
        .map((id: any) => id.toString())
        .includes(assignedTo);

      if (!isValidAssignee) {
        return res.status(400).json({
          message: "Assigned user must be workspace member",
        });
      }

      task.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    await task.save();

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
 * Delete Task
 *
 * Permanently deletes a task. User must be a workspace member to delete.
 * This action cannot be undone.
 *
 * @route DELETE /api/task/:taskId
 * @access Private (requires authentication and workspace membership)
 *
 * URL Parameters:
 * - taskId: string (required, MongoDB ObjectId, validated by Zod)
 *
 * Response:
 * - 200: Task deleted successfully
 * - 400: Validation error (invalid task ID format)
 * - 403: Not authorized (user not a workspace member)
 * - 404: Task not found
 * - 500: Internal server error
 *
 * @security
 * - Validates task ID using Zod schema
 * - Verifies task and workspace exist
 * - Checks user is a workspace member before allowing deletion
 * - Deletion is permanent and irreversible
 * - Task reference removed from project.tasks array (bidirectional relationship)
 *
 * @warning This action permanently removes the task and cannot be undone
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

    const task = await Task.findById(taskId)
      .populate("workspace")
      .populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const workspace: any = task.workspace;

    // Check if user is a workspace member
    const isMember = workspace.members
      .map((id: any) => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove task reference from project.tasks array
    const project: any = task.project;
    if (project) {
      project.tasks = project.tasks.filter(
        (id: any) => id.toString() !== task._id.toString()
      );
      await project.save();
    }

    await task.deleteOne();

    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
