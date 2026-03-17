import cron from "node-cron";
import { Task } from "../models/task.model";
import { sendTaskDigestEmail } from "../utils/email.service";

interface DigestTask {
  title: string;
  projectName: string;
  dueDate: Date;
}

interface UserDigest {
  email: string;
  overdue: DigestTask[];
  dueSoon: DigestTask[];
}

/**
 * Core digest logic — queries overdue and due-soon tasks, groups them
 * per assignee, and sends one digest email per user.
 */
export async function runTaskDigest(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [overdueTasks, dueSoonTasks] = await Promise.all([
    Task.find({
      dueDate: { $lt: now },
      status: { $ne: "done" },
      assignedTo: { $exists: true, $ne: null },
    })
      .populate("project", "name")
      .populate("assignedTo", "email"),

    Task.find({
      dueDate: { $gte: now, $lte: in24h },
      status: { $ne: "done" },
      assignedTo: { $exists: true, $ne: null },
    })
      .populate("project", "name")
      .populate("assignedTo", "email"),
  ]);

  // Group tasks by assignee into a per-user digest map
  const userMap = new Map<string, UserDigest>();

  const addToMap = (task: any, bucket: "overdue" | "dueSoon") => {
    const assignee = task.assignedTo as any;
    const userId = assignee._id.toString();
    if (!userMap.has(userId)) {
      userMap.set(userId, { email: assignee.email, overdue: [], dueSoon: [] });
    }
    userMap.get(userId)![bucket].push({
      title: task.title,
      projectName: (task.project as any).name,
      dueDate: task.dueDate,
    });
  };

  overdueTasks.forEach((t) => addToMap(t, "overdue"));
  dueSoonTasks.forEach((t) => addToMap(t, "dueSoon"));

  // Send one digest per user (fire-and-forget per user)
  for (const digest of userMap.values()) {
    sendTaskDigestEmail(digest.email, digest.overdue, digest.dueSoon).catch((err) =>
      console.error("[TaskDigest] Failed to send digest email:", err)
    );
  }

  console.log(`[TaskDigest] Digests dispatched to ${userMap.size} user(s)`);
}

/**
 * Schedules a daily digest email at 08:00 server time.
 * Must be called after the database connection is established.
 */
export function scheduleTaskDigest() {
  cron.schedule("0 0 * * *", async () => {
    try {
      await runTaskDigest();
    } catch (err) {
      console.error("[TaskDigest] Error running daily digest:", err);
    }
  });

  console.log("[TaskDigest] Daily task digest scheduled at 00:00");
}
