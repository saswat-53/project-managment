import { Request, Response } from "express";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { getUserWorkspaceRole } from "../utils/workspaceRole";
import { parseGithubUrl, getFileTree, getFileContent } from "../utils/github";
import { decrypt } from "../utils/crypto";
import { selectRelevantFiles, generatePlanMarkdown } from "../utils/aiPlanner";
import { uploadBuffer, getPublicUrl } from "../utils/r2";
import { getIO } from "../socket";

// ─── In-memory sliding window rate limiter ────────────────────────────────────
// 10 plans per user per hour. Resets naturally as old timestamps age out.
// NOTE: in-memory only — does not persist across restarts, not shared across
// multiple server instances. Acceptable for single-server v1 deployment.

const PLAN_RATE_LIMIT = 10;
const PLAN_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const planRequestLog = new Map<string, number[]>();

function checkPlanRateLimit(
  userId: string
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (planRequestLog.get(userId) ?? []).filter(
    (t) => now - t < PLAN_RATE_WINDOW_MS
  );

  if (timestamps.length >= PLAN_RATE_LIMIT) {
    const oldest = timestamps[0];
    return { ok: false, retryAfterMs: PLAN_RATE_WINDOW_MS - (now - oldest) };
  }

  timestamps.push(now);
  planRequestLog.set(userId, timestamps);
  return { ok: true };
}

function rollbackRateLimit(userId: string): void {
  const timestamps = planRequestLog.get(userId);
  if (timestamps && timestamps.length > 0) {
    timestamps.pop();
    planRequestLog.set(userId, timestamps);
  }
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const generateTaskPlan = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req as any).user._id.toString();

  // 1. Rate limit check
  const rateCheck = checkPlanRateLimit(userId);
  if (!rateCheck.ok) {
    const minutes = Math.ceil(rateCheck.retryAfterMs / 60000);
    return res.status(429).json({
      message: `Rate limit reached. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
      retryAfterMs: rateCheck.retryAfterMs,
    });
  }

  try {
    // 2. Load task
    const task = await Task.findById(taskId);
    if (!task) {
      rollbackRateLimit(userId);
      return res.status(404).json({ message: "Task not found" });
    }

    // 3. Load project
    const project = await Project.findById(task.project);
    if (!project) {
      rollbackRateLimit(userId);
      return res.status(404).json({ message: "Project not found" });
    }
    if (!project.repoUrl) {
      rollbackRateLimit(userId);
      return res.status(400).json({
        message: "Project has no linked GitHub repository. Edit the project to add one.",
        code: "NO_REPO_URL",
      });
    }

    // Decrypt project-level GitHub token (falls back to env var inside getFileTree)
    const projectToken = project.githubToken ? decrypt(project.githubToken) ?? undefined : undefined;

    // 4. Role gate — admin/manager only
    const role = await getUserWorkspaceRole(userId, task.workspace.toString());
    if (role !== "admin" && role !== "manager") {
      rollbackRateLimit(userId);
      return res.status(403).json({ message: "Only managers can generate plans" });
    }

    // 5. Parse GitHub URL
    const parsed = parseGithubUrl(project.repoUrl);
    if (!parsed) {
      rollbackRateLimit(userId);
      return res.status(400).json({ message: "Invalid GitHub repo URL" });
    }
    const { owner, repo } = parsed;

    // 6. Fetch file tree
    let fileTree: string[];
    try {
      fileTree = await getFileTree(owner, repo, projectToken);
    } catch (err: any) {
      rollbackRateLimit(userId);
      if (err.githubStatus === 404) {
        return res.status(502).json({
          message: "Cannot access repository. If it's private, add a GitHub token to this project.",
          code: "GITHUB_ACCESS_DENIED",
        });
      }
      if (err.githubStatus === 401) {
        return res.status(502).json({
          message: "Invalid GitHub token. Clear GITHUB_TOKEN in .env or set a valid token.",
          code: "GITHUB_BAD_TOKEN",
        });
      }
      if (err.githubStatus === 403) {
        return res.status(502).json({
          message: "GitHub rate limit reached. Try again later.",
        });
      }
      console.error("[generateTaskPlan] getFileTree error:", err);
      return res.status(502).json({ message: "Failed to fetch repository tree." });
    }

    const generationStart = Date.now();

    // 7. Pass 1 — select relevant files
    const selectedPaths = await selectRelevantFiles(task, project, fileTree);

    // 8. Fetch file contents in parallel (skip failures silently)
    const fileResults = await Promise.all(
      selectedPaths.map((p) =>
        getFileContent(owner, repo, p, projectToken).catch(() => null)
      )
    );
    const files = fileResults.filter(
      (f): f is { path: string; content: string } => f !== null
    );

    // 9. Resolve assignee name for the plan
    let memberName = "the assignee";
    if (task.assignedTo) {
      const assignee = await User.findById(task.assignedTo).select("name");
      if (assignee) memberName = assignee.name;
    }

    // 10. Pass 2 — generate plan markdown
    const markdown = await generatePlanMarkdown(task, project, files, memberName);

    // 11. Upload plan markdown to R2 (best-effort — failure does not abort the request)
    const planKey = `plans/${task._id}.md`;
    try {
      await uploadBuffer(planKey, markdown, "text/markdown");
      task.planUrl = getPublicUrl(planKey);
    } catch (r2Err) {
      console.warn("[generateTaskPlan] R2 upload failed — plan saved to DB only:", r2Err);
    }

    // 12. Save to task
    task.planMarkdown = markdown;
    task.planGeneratedAt = new Date();
    task.planDuration = Math.round((Date.now() - generationStart) / 1000);
    await task.save();

    // 13. Populate for socket emit
    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl")
      .populate("comments.author", "name email avatarUrl")
      .populate("comments.replies.author", "name email avatarUrl")
      .populate("attachments.uploadedBy", "name email avatarUrl");

    // 14. Emit real-time update
    getIO()
      .to(`project:${task.project}`)
      .emit("task:updated", { task: populatedTask });

    return res.status(200).json({ message: "Plan generated", task: populatedTask });
  } catch (err) {
    console.error("[generateTaskPlan]", err);
    rollbackRateLimit(userId);
    return res.status(500).json({ message: "Plan generation failed" });
  }
};
