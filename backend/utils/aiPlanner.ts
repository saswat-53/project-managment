import OpenAI from "openai";
import { ITask } from "../models/task.model";
import { IProject } from "../models/project.model";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
});

const FILE_SELECTION_SYSTEM = `You are a code assistant. Your job is to identify which files in a repository are most relevant to a given task. You must respond with ONLY a valid JSON array of file paths — no explanation, no markdown fences, no other text.`;

const PLAN_GENERATION_SYSTEM = `You are a senior software engineer creating an implementation plan for a teammate. Your plan must be clear, specific, and immediately actionable.

CRITICAL RULES — violating these makes the plan useless:
1. NEVER rewrite or replace an entire file. Only show the minimal changes — the exact lines to add, modify, or remove.
2. ALWAYS read the existing code in each file carefully before suggesting changes. Preserve all existing logic, imports, components, and functions that are not directly related to the task.
3. For each code change, show only the relevant section with enough surrounding context (a few lines before/after) so the developer can locate it. Use a comment like "// around line X" or "// in the Props type" to orient them.
4. If a file already has a partial or stub implementation of the feature (e.g. an unwired input field), build on it — do not create a new one alongside it.
5. Note any framework-specific patterns found in the existing code and follow them exactly (e.g. if the codebase uses React.use(params) for route params, do not suggest params.id directly).

Structure your output as valid markdown with these exact sections:
1. ## Summary (2-3 sentences)
2. ## Files to change (markdown table: file | reason | type of change)
3. ## Step-by-step implementation (numbered, reference specific files and line numbers)
4. ## Code changes (per file: MINIMAL diffs only — existing code + what to add/change, not full rewrites)
5. ## Testing checklist (- [ ] checkboxes)
6. ## Potential pitfalls (bullets)`;

function buildFileSelectionPrompt(
  task: ITask,
  project: IProject,
  fileTree: string[]
): string {
  return `Task title: ${task.title}
Task description: ${(task as any).description || "(no description)"}
Project: ${project.name}

File tree of the repository:
${fileTree.join("\n")}

Select the 8 to 12 files most likely to need changes or be referenced when completing this task.

Selection strategy — think in layers:
1. ENTRY POINT: What is the top-level page, route, or screen where this feature lives? Include it even if its filename doesn't contain task keywords.
2. DIRECT CHANGES: Which files will need new code written in them? (components, controllers, models, routes)
3. SHARED DEPENDENCIES: Which files define types, utilities, or API endpoints used by the above files?
4. PARENT/CONTAINER: If a component needs a new prop, its parent that passes the prop must also be included.

Prefer: page components, layout/header components, route files, controllers, models, shared state/API files, and utility files.
Avoid: lock files, build artifacts, auto-generated files, test snapshots.

Respond with ONLY a JSON array like:
["src/routes/dashboard.ts", "src/middleware/auth.ts"]`;
}

function buildPlanPrompt(
  task: ITask,
  project: IProject,
  files: { path: string; content: string }[],
  memberName: string
): string {
  const fileBlocks = files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join("\n\n");

  return `Task: ${task.title}
Description: ${(task as any).description || "(no description)"}
Assigned to: ${memberName}
Repository: ${project.repoUrl}

BEFORE writing any code changes, carefully read every file below in full. Note:
- Existing types, props, and function signatures (do not change them unless the task requires it)
- Stub or placeholder implementations already present (wire them up instead of creating new ones)
- Framework patterns in use (e.g. React.use(params) for async route params, skip options on queries)
- Any existing partial implementation of the feature being asked for

Relevant files:

${fileBlocks}

Generate a detailed implementation plan following the system rules. Be specific about line numbers. Show only the minimal code changes needed — do not reproduce entire files.`;
}

function keywordFallback(task: ITask, fileTree: string[]): string[] {
  const words = task.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const scored = fileTree.map((path) => {
    const lower = path.toLowerCase();
    const score = words.reduce((acc, word) => acc + (lower.includes(word) ? 1 : 0), 0);
    return { path, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((e) => e.path);
}

export async function selectRelevantFiles(
  task: ITask,
  project: IProject,
  fileTree: string[]
): Promise<string[]> {
  const userPrompt = buildFileSelectionPrompt(task, project, fileTree);

  const tryParse = async (strict: boolean): Promise<string[] | null> => {
    const system = strict
      ? FILE_SELECTION_SYSTEM +
        "\n\nIMPORTANT: Your previous response was not valid JSON. You MUST respond with ONLY a raw JSON array — no text, no backticks, no explanation whatsoever."
      : FILE_SELECTION_SYSTEM;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string")) {
        // Only return paths that actually exist in the tree
        return parsed.filter((p) => fileTree.includes(p));
      }
      return null;
    } catch {
      return null;
    }
  };

  const first = await tryParse(false);
  if (first && first.length > 0) return first;

  console.warn("[aiPlanner] Pass 1 JSON parse failed — retrying with stricter prompt");
  const second = await tryParse(true);
  if (second && second.length > 0) return second;

  console.warn("[aiPlanner] Pass 1 retry failed — falling back to keyword matching");
  return keywordFallback(task, fileTree);
}

export async function generatePlanMarkdown(
  task: ITask,
  project: IProject,
  files: { path: string; content: string }[],
  memberName: string
): Promise<string> {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: PLAN_GENERATION_SYSTEM },
      { role: "user", content: buildPlanPrompt(task, project, files, memberName) },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content ?? "";
}
