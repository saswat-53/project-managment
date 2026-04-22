import { Request, Response } from "express";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import { getUserWorkspaceRole } from "../utils/workspaceRole";
import { decrypt } from "../utils/crypto";
import { runPlanAgent } from "../utils/agentExecutor";
import { parseGithubUrl } from "../utils/github";
import { getIO } from "../socket";

async function emitTaskUpdate(taskId: string) {
  const populated = await Task.findById(taskId)
    .populate("assignedTo", "name email avatarUrl")
    .populate("createdBy", "name email avatarUrl")
    .populate("comments.author", "name email avatarUrl")
    .populate("comments.replies.author", "name email avatarUrl")
    .populate("attachments.uploadedBy", "name email avatarUrl");

  if (populated) {
    getIO()
      .to(`project:${populated.project}`)
      .emit("task:updated", { task: populated });
  }
}

export const getRepoBranches = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const project = await Project.findById(task.project);
  if (!project?.repoUrl) {
    return res.status(400).json({ message: "No GitHub repository linked to this project.", code: "NO_REPO_URL" });
  }

  const projectToken = project.githubToken ? decrypt(project.githubToken) ?? undefined : undefined;
  const token = projectToken || process.env.GITHUB_TOKEN || "";
  if (!token) {
    return res.status(400).json({ message: "No GitHub token available.", code: "NO_GITHUB_TOKEN" });
  }

  const parsed = parseGithubUrl(project.repoUrl);
  if (!parsed) return res.status(400).json({ message: "Invalid GitHub repository URL." });

  const [branchRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches?per_page=100`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }),
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
      },
    }),
  ]);

  if (!branchRes.ok) {
    return res.status(502).json({ message: "Failed to fetch branches from GitHub." });
  }

  const branchData = await branchRes.json();
  const repoData = repoRes.ok ? await repoRes.json() : {};
  const branches = (branchData as any[]).map((b: any) => b.name as string);
  const defaultBranch = (repoData as any).default_branch ?? branches[0] ?? "main";

  return res.status(200).json({ branches, defaultBranch });
};

export const cancelTaskExecution = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req as any).user._id.toString();

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const role = await getUserWorkspaceRole(userId, task.workspace.toString());
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ message: "Only managers can cancel execution." });
  }

  if (task.executionStatus !== "running") {
    return res.status(409).json({ message: "No execution is currently running." });
  }

  task.executionStatus = "cancelled";
  task.executionLog = "Cancelled by user.";
  await task.save();
  await emitTaskUpdate(taskId);

  return res.status(200).json({ message: "Execution cancelled." });
};

export const executeTaskPlan = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req as any).user._id.toString();

  // 1. Load task
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  // 2. Load project
  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: "Project not found" });

  if (!project.repoUrl) {
    return res.status(400).json({
      message: "Project has no linked GitHub repository. Edit the project to add one.",
      code: "NO_REPO_URL",
    });
  }

  if (!task.planMarkdown) {
    return res.status(400).json({
      message: "No plan exists yet. Generate a plan first.",
      code: "NO_PLAN",
    });
  }

  // 3. Resolve GitHub token — project-level first, then server env
  const projectToken = project.githubToken
    ? decrypt(project.githubToken) ?? undefined
    : undefined;
  const resolvedToken = projectToken || process.env.GITHUB_TOKEN || "";

  if (!resolvedToken) {
    return res.status(400).json({
      message:
        "No GitHub token linked to this project. Ask your project admin to add a GitHub PAT (with repo write scope) via the Plan tab.",
      code: "NO_GITHUB_TOKEN",
    });
  }

  // 4. Role gate — admin/manager only
  const role = await getUserWorkspaceRole(userId, task.workspace.toString());
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ message: "Only managers can execute plans." });
  }

  // 5. Prevent concurrent runs
  if (task.executionStatus === "running") {
    return res.status(409).json({ message: "Execution already in progress." });
  }

  // 6. Mark running + respond 202 immediately
  const { baseBranch } = req.body as { baseBranch?: string };

  task.executionStatus = "running";
  task.executionStartedAt = new Date();
  task.executionLog = undefined;
  task.prUrl = undefined;
  await task.save();
  await emitTaskUpdate(taskId);

  res.status(202).json({ message: "Execution started" });

  runPlanAgent(task, project, resolvedToken, baseBranch || undefined)
    .then(async ({ prUrl, log }) => {
      const t = await Task.findById(taskId);
      if (!t) return;
      // Don't overwrite a user-cancelled status
      if (t.executionStatus === "cancelled") return;
      t.executionStatus = "pr_opened";
      t.prUrl = prUrl;
      t.executionLog = log;
      await t.save();
      await emitTaskUpdate(taskId);
    })
    .catch(async (err: Error) => {
      console.error("[executeTaskPlan]", err);
      const t = await Task.findById(taskId);
      if (!t) return;
      // Don't overwrite a user-cancelled status
      if (t.executionStatus === "cancelled") return;
      t.executionStatus = "failed";
      t.executionLog = err.message;
      await t.save();
      await emitTaskUpdate(taskId);
    });
};
