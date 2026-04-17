"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Download, Loader2, RefreshCw, Wand2, GitBranch, CheckCircle } from "lucide-react";
import { Task, useGenerateTaskPlanMutation, useUpdateProjectMutation } from "@/state/api";

type Props = {
  task: Task;
  canModerate: boolean;
};

const NO_REPO_CODE = "NO_REPO_URL";
const GITHUB_ACCESS_CODE = "GITHUB_ACCESS_DENIED";

const TaskPlanViewer = ({ task, canModerate }: Props) => {
  const [generatePlan, { isLoading }] = useGenerateTaskPlanMutation();
  const [updateProject, { isLoading: isSavingRepo }] = useUpdateProjectMutation();
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Inline fix form state
  const [showRepoForm, setShowRepoForm] = useState(false);
  const [repoFormMode, setRepoFormMode] = useState<"no_repo" | "no_token">("no_repo");
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [repoSaved, setRepoSaved] = useState(false);

  // Tick elapsed seconds counter while generating
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleGenerate = async () => {
    setError("");
    setShowRepoForm(false);
    setRepoSaved(false);
    try {
      await generatePlan({ taskId: task._id }).unwrap();
    } catch (err: any) {
      const msg = err?.data?.message ?? "Plan generation failed. Please try again.";
      const code = err?.data?.code;
      setError(msg);
      if (canModerate && code === NO_REPO_CODE) {
        setRepoFormMode("no_repo");
        setShowRepoForm(true);
      } else if (canModerate && code === GITHUB_ACCESS_CODE) {
        setRepoFormMode("no_token");
        setShowRepoForm(true);
      }
    }
  };

  const handleSaveRepo = async () => {
    const updates: { projectId: string; repoUrl?: string; githubToken?: string } = {
      projectId: task.project,
    };
    if (repoFormMode === "no_repo" && repoUrlInput.trim()) {
      updates.repoUrl = repoUrlInput.trim();
    }
    if (githubTokenInput.trim()) {
      updates.githubToken = githubTokenInput.trim();
    }
    if (!updates.repoUrl && !updates.githubToken) return;
    try {
      await updateProject(updates).unwrap();
      setRepoSaved(true);
      setShowRepoForm(false);
      setError("");
      setRepoUrlInput("");
      setGithubTokenInput("");
    } catch (err: any) {
      setError(err?.data?.message ?? "Failed to save project settings.");
    }
  };

  const handleDownload = () => {
    if (!task.planMarkdown) return;
    const blob = new Blob([task.planMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plan.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasPlan = Boolean(task.planMarkdown);

  return (
    <div className="flex flex-col gap-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasPlan && task.planGeneratedAt && (
            <span className="text-[11px] text-gray-400 dark:text-neutral-500">
              Generated{" "}
              {formatDistanceToNow(new Date(task.planGeneratedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasPlan && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-white"
              title="Download plan.md"
            >
              <Download size={13} />
              Download
            </button>
          )}
          {canModerate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Generating… {elapsedSeconds}s
                </>
              ) : hasPlan ? (
                <>
                  <RefreshCw size={12} />
                  Regenerate
                </>
              ) : (
                <>
                  <Wand2 size={12} />
                  Generate Plan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Repo-saved confirmation */}
      {repoSaved && (
        <div className="flex items-center gap-2 rounded border border-green-300 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/40">
          <CheckCircle size={13} className="shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-xs text-green-700 dark:text-green-400">
            Repo URL saved. Click Generate Plan to continue.
          </p>
        </div>
      )}

      {/* Inline fix form — no repo URL or no GitHub token */}
      {showRepoForm && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-2">
            <GitBranch size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              {repoFormMode === "no_repo"
                ? "No GitHub repo linked to this project"
                : "Cannot access repository"}
            </p>
          </div>
          <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-400">
            {repoFormMode === "no_repo"
              ? "Add a repo URL so the AI planner can read your code."
              : "This repo may be private. Add a GitHub PAT with repo read access."}
          </p>
          <div className="flex flex-col gap-2">
            {repoFormMode === "no_repo" && (
              <input
                type="url"
                placeholder="https://github.com/org/repo"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                className="rounded border border-amber-300 bg-white px-2 py-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-700 dark:bg-dark-tertiary dark:text-white dark:placeholder-neutral-500"
              />
            )}
            <input
              type="password"
              placeholder="GitHub PAT (ghp_…) — optional for public repos"
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              autoComplete="off"
              className="rounded border border-amber-300 bg-white px-2 py-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-700 dark:bg-dark-tertiary dark:text-white dark:placeholder-neutral-500"
            />
            <button
              type="button"
              onClick={handleSaveRepo}
              disabled={isSavingRepo || (repoFormMode === "no_repo" && !repoUrlInput.trim())}
              className="flex items-center justify-center gap-1 rounded bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingRepo ? <Loader2 size={11} className="animate-spin" /> : null}
              Save & continue
            </button>
          </div>
        </div>
      )}

      {/* Generic error banner (non-repo errors) */}
      {error && !showRepoForm && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/40">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Content area */}
      {isLoading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-gray-400 dark:text-neutral-500">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Generating plan… {elapsedSeconds}s</p>
          <p className="text-xs text-gray-300 dark:text-neutral-600">
            Analysing your repository and writing the implementation plan
          </p>
        </div>
      ) : !hasPlan ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-400 dark:text-neutral-500">
          <Wand2 size={28} className="opacity-40" />
          <p className="text-sm">No plan yet.</p>
          {canModerate ? (
            <p className="text-xs">Click Generate Plan to create one.</p>
          ) : (
            <p className="text-xs">A manager will generate a plan for this task.</p>
          )}
        </div>
      ) : (
        <div className="rounded border border-gray-100 bg-gray-50 p-4 dark:border-stroke-dark dark:bg-dark-tertiary">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Render headings with appropriate weight
              h1: ({ children }) => (
                <h1 className="mb-3 mt-4 text-lg font-bold text-gray-800 dark:text-white first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 mt-4 text-base font-semibold text-gray-700 dark:text-gray-200 first:mt-0">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1.5 mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mb-2 text-sm leading-relaxed text-gray-600 dark:text-neutral-300">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-gray-600 dark:text-neutral-300">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-gray-600 dark:text-neutral-300">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-sm text-gray-600 dark:text-neutral-300">
                  {children}
                </li>
              ),
              // Make checkboxes read-only (Phase 2 will add persistence)
              input: ({ type, checked }) =>
                type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-1.5 cursor-default accent-amber-400"
                  />
                ) : null,
              code: ({ inline, children }: any) =>
                inline ? (
                  <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs text-gray-800 dark:bg-dark-secondary dark:text-gray-300">
                    {children}
                  </code>
                ) : (
                  <pre className="mb-3 overflow-x-auto rounded bg-gray-200 p-3 font-mono text-xs text-gray-800 dark:bg-dark-secondary dark:text-gray-300">
                    <code>{children}</code>
                  </pre>
                ),
              table: ({ children }) => (
                <div className="mb-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold text-gray-700 dark:border-stroke-dark dark:bg-dark-secondary dark:text-gray-300">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-200 px-2 py-1 text-gray-600 dark:border-stroke-dark dark:text-neutral-300">
                  {children}
                </td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="mb-3 border-l-4 border-amber-400 pl-3 text-sm italic text-gray-500 dark:text-neutral-400">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="my-3 border-gray-200 dark:border-stroke-dark" />
              ),
            }}
          >
            {task.planMarkdown}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default TaskPlanViewer;
