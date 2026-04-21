"use client";

import { useState, useEffect, useRef } from "react";
import {
  GitBranch, CheckCircle, Play, ExternalLink, AlertCircle,
  Square, Loader2, FileCode, GitCommit, GitPullRequest,
  RefreshCw, Zap,
} from "lucide-react";
import {
  Task,
  api,
  useExecuteTaskPlanMutation,
  useCancelTaskExecutionMutation,
  useUpdateProjectMutation,
  useLazyGetRepoBranchesQuery,
} from "@/state/api";
import { useAppDispatch } from "@/app/redux";

// ─── File path extractor (mirrors backend logic) ──────────────────────────────

function extractFilesFromPlan(planMarkdown: string): string[] {
  const tablePaths: string[] = [];
  for (const m of planMarkdown.matchAll(/\|\s*`?([^\s|`]+\.[a-zA-Z]{1,10})`?\s*\|/g)) {
    const p = m[1].trim();
    if (p.includes("/")) tablePaths.push(p);
  }
  if (tablePaths.length > 0) {
    const unique: string[] = [];
    for (const p of tablePaths) {
      const covered = unique.some((u) => u === p || u.endsWith("/" + p));
      if (!covered) unique.push(p);
    }
    return unique.slice(0, 8); // cap at 8 for display
  }
  const fallback = new Set<string>();
  for (const m of planMarkdown.matchAll(/`([^`]+\.[a-zA-Z]{1,10})`/g)) {
    const p = m[1].trim();
    if (p.includes("/") && !p.includes(" ")) fallback.add(p);
  }
  return Array.from(fallback).slice(0, 8);
}

function shortPath(p: string): string {
  const parts = p.split("/");
  if (parts.length <= 2) return p;
  return "…/" + parts.slice(-2).join("/");
}

function fileExt(p: string): string {
  return p.split(".").pop() ?? "file";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FileStepState = "waiting" | "fetching" | "implementing" | "writing" | "done" | "failed";

interface FileStep {
  path: string;
  state: FileStepState;
}

type PipelinePhase =
  | "idle"
  | "files"       // processing files
  | "committing"  // git add/commit
  | "pushing"     // git push
  | "pr"          // opening PR
  | "done"
  | "failed"
  | "cancelled";

// ─── Simulated timeline ───────────────────────────────────────────────────────
// Given N files, spread state transitions across ~totalMs milliseconds.
// Returns an array of (ms, fileIndex, newState) events.
function buildTimeline(
  fileCount: number,
  totalMs: number
): Array<{ ms: number; fileIndex: number; state: FileStepState }> {
  const events: Array<{ ms: number; fileIndex: number; state: FileStepState }> = [];
  // Reserve 20% for commit/push/PR at the end — files get 80%
  const fileBudget = totalMs * 0.78;
  const perFile = fileBudget / fileCount;

  for (let i = 0; i < fileCount; i++) {
    const base = i * perFile;
    // fetching starts immediately at base
    events.push({ ms: base, fileIndex: i, state: "fetching" });
    // implementing after 10% of slot
    events.push({ ms: base + perFile * 0.15, fileIndex: i, state: "implementing" });
    // writing after 75%
    events.push({ ms: base + perFile * 0.78, fileIndex: i, state: "writing" });
    // done at end of slot minus small gap
    events.push({ ms: base + perFile * 0.96, fileIndex: i, state: "done" });
  }
  return events.sort((a, b) => a.ms - b.ms);
}

// ─── Animated status label ────────────────────────────────────────────────────
const FILE_LABELS: Record<FileStepState, string> = {
  waiting: "waiting",
  fetching: "fetching…",
  implementing: "implementing…",
  writing: "writing…",
  done: "done",
  failed: "failed",
};

const EXT_COLORS: Record<string, string> = {
  ts: "text-blue-400",
  tsx: "text-cyan-400",
  js: "text-yellow-400",
  jsx: "text-yellow-300",
  py: "text-green-400",
  go: "text-teal-400",
  rs: "text-orange-400",
  css: "text-pink-400",
  json: "text-purple-400",
  md: "text-gray-400",
};

function extColor(ext: string): string {
  return EXT_COLORS[ext] ?? "text-gray-400";
}

// ─── Component ────────────────────────────────────────────────────────────────

const NO_GITHUB_TOKEN_CODE = "NO_GITHUB_TOKEN";

interface Props {
  task: Task;
  canModerate: boolean;
}

export default function ExecutePlanSection({ task, canModerate }: Props) {
  const dispatch = useAppDispatch();
  const [executePlan, { isLoading: isStarting }] = useExecuteTaskPlanMutation();
  const [cancelExecution, { isLoading: isCancelling }] = useCancelTaskExecutionMutation();
  const [updateProject, { isLoading: isSavingToken }] = useUpdateProjectMutation();

  const [fetchBranches, { data: branchData, isFetching: isFetchingBranches }] =
    useLazyGetRepoBranchesQuery();

  const [execError, setExecError] = useState("");
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");

  // Pipeline simulation state
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [fileSteps, setFileSteps] = useState<FileStep[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timelineTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isRunning = task.executionStatus === "running";
  const isPrOpened = task.executionStatus === "pr_opened";
  const isFailed = task.executionStatus === "failed";
  const isCancelled = task.executionStatus === "cancelled";
  const isIdle = !task.executionStatus || task.executionStatus === "idle";

  const files = task.planMarkdown ? extractFilesFromPlan(task.planMarkdown) : [];

  // ── Estimated duration (heuristic: 12s per file + 15s overhead, capped) ──
  const estimatedMs = Math.min(Math.max(files.length * 12_000 + 15_000, 20_000), 120_000);

  function clearSimulation() {
    timelineTimers.current.forEach(clearTimeout);
    timelineTimers.current = [];
    if (elapsedInterval.current) clearInterval(elapsedInterval.current);
    elapsedInterval.current = null;
  }

  function startSimulation() {
    clearSimulation();
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setPhase("files");

    const activeFiles = files;
    const duration = estimatedMs;

    const initialSteps: FileStep[] = activeFiles.map((p) => ({ path: p, state: "waiting" }));
    setFileSteps(initialSteps);

    // Elapsed ticker
    elapsedInterval.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 250);

    if (activeFiles.length === 0) return;

    // Schedule file state transitions
    const timeline = buildTimeline(activeFiles.length, duration * 0.8);
    for (const { ms, fileIndex, state } of timeline) {
      const t = setTimeout(() => {
        setFileSteps((prev) => {
          const next = [...prev];
          next[fileIndex] = { ...next[fileIndex], state };
          return next;
        });
      }, ms);
      timelineTimers.current.push(t);
    }

    // Schedule commit/push/PR phases
    const commitMs = duration * 0.82;
    timelineTimers.current.push(
      setTimeout(() => setPhase("committing"), commitMs),
      setTimeout(() => setPhase("pushing"), commitMs + duration * 0.06),
      setTimeout(() => setPhase("pr"), commitMs + duration * 0.12),
    );
  }

  // React to task.executionStatus changes
  useEffect(() => {
    if (isRunning) {
      if (phase === "idle") startSimulation();
    } else if (isPrOpened) {
      clearSimulation();
      // Snap all files to done
      setFileSteps((prev) => prev.map((f) => ({ ...f, state: "done" as FileStepState })));
      setPhase("done");
    } else if (isFailed) {
      clearSimulation();
      setPhase("failed");
    } else if (isCancelled) {
      clearSimulation();
      setPhase("cancelled");
    } else if (isIdle) {
      clearSimulation();
      setPhase("idle");
      setFileSteps([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.executionStatus]);

  // Cleanup on unmount
  useEffect(() => () => clearSimulation(), []);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
  };

  // Step 1: show branch picker (fetch branches lazily)
  const handleRequestExecute = async () => {
    setExecError("");
    setShowTokenForm(false);
    setTokenSaved(false);
    setShowBranchPicker(true);
    const result = await fetchBranches(task._id);
    const defaultBranch = result.data?.defaultBranch ?? result.data?.branches?.[0] ?? "main";
    setSelectedBranch(defaultBranch);
  };

  // Step 2: confirmed branch — actually run
  const handleConfirmBranch = async () => {
    setExecError("");
    setShowBranchPicker(false);
    try {
      await executePlan({ taskId: task._id, baseBranch: selectedBranch }).unwrap();
      // 202 received — optimistically mark as running so the UI doesn't
      // briefly revert to idle before the socket event arrives.
      dispatch(
        api.util.updateQueryData("getTasks", { projectId: task.project }, (draft) => {
          const t = draft.find((t) => t._id === task._id);
          if (t) t.executionStatus = "running";
        }),
      );
    } catch (err: any) {
      const code = err?.data?.code;
      const msg = err?.data?.message ?? "Failed to start execution.";
      setExecError(msg);
      if (code === NO_GITHUB_TOKEN_CODE) setShowTokenForm(true);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelExecution({ taskId: task._id }).unwrap();
    } catch (err: any) {
      setExecError(err?.data?.message ?? "Failed to cancel.");
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    try {
      await updateProject({ projectId: task.project, githubToken: tokenInput.trim() }).unwrap();
      setTokenSaved(true);
      setShowTokenForm(false);
      setExecError("");
      setTokenInput("");
    } catch (err: any) {
      setExecError(err?.data?.message ?? "Failed to save token.");
    }
  };

  if (!canModerate) return null;

  const isActive = isRunning || phase === "files" || phase === "committing" || phase === "pushing" || phase === "pr";
  const showPipeline = isActive || phase === "done" || phase === "failed" || phase === "cancelled";

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="h-px bg-gray-100 dark:bg-stroke-dark" />

      {/* ── Section label + action row ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-neutral-500">
            Execute Plan
          </span>
          {(isIdle || isFailed || isCancelled) && (
            <button
              type="button"
              onClick={() => { setShowTokenForm((v) => !v); setExecError(""); setTokenSaved(false); }}
              className="font-mono text-xs text-gray-400 underline decoration-dotted hover:text-gray-600 dark:text-neutral-600 dark:hover:text-neutral-400"
            >
              {showTokenForm ? "cancel" : "set token"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="group flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 font-mono text-sm text-gray-500 transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-50 dark:border-stroke-dark dark:bg-dark-secondary dark:text-neutral-400 dark:hover:border-red-800 dark:hover:text-red-400"
            >
              {isCancelling
                ? <Loader2 size={14} className="animate-spin" />
                : <Square size={14} className="group-hover:fill-red-500/20" />
              }
              stop
            </button>
          )}
          {(isIdle || isFailed || isCancelled) && (
            <button
              type="button"
              onClick={handleRequestExecute}
              disabled={isStarting || showBranchPicker}
              className="relative flex items-center gap-1.5 overflow-hidden rounded bg-indigo-600 px-3 py-1.5 font-mono text-sm font-medium text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* shimmer on idle */}
              {isIdle && !isStarting && (
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  style={{ animation: "shimmer 2.5s ease-in-out infinite" }}
                />
              )}
              {isStarting
                ? <Loader2 size={14} className="animate-spin" />
                : isFailed || isCancelled
                  ? <RefreshCw size={14} />
                  : <Play size={14} className="fill-white" />
              }
              {isStarting ? "starting…" : isFailed || isCancelled ? "retry" : "run agent"}
            </button>
          )}
        </div>
      </div>

      {/* ── Token saved ── */}
      {tokenSaved && (
        <div className="flex items-center gap-2 rounded border border-green-300 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/40">
          <CheckCircle size={12} className="shrink-0 text-green-600 dark:text-green-400" />
          <p className="font-mono text-sm text-green-700 dark:text-green-400">
            Token saved — click run agent to continue.
          </p>
        </div>
      )}

      {/* ── Inline token form ── */}
      {showTokenForm && (
        <div className="rounded border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
          <div className="mb-1.5 flex items-center gap-2">
            <GitBranch size={12} className="shrink-0 text-amber-500" />
            <p className="font-mono text-sm font-medium text-amber-700 dark:text-amber-300">
              No GitHub token linked
            </p>
          </div>
          <p className="mb-2.5 font-mono text-xs leading-relaxed text-amber-600/80 dark:text-amber-500/80">
            Provide a PAT with <strong>repo</strong> write scope so the agent can push + open PRs.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="ghp_…"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoComplete="off"
              className="min-w-0 flex-1 rounded border border-amber-200 bg-white px-2 py-1 font-mono text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-800/60 dark:bg-dark-tertiary dark:text-white dark:placeholder-neutral-600"
            />
            <button
              type="button"
              onClick={handleSaveToken}
              disabled={isSavingToken || !tokenInput.trim()}
              className="flex shrink-0 items-center gap-1 rounded bg-amber-400 px-2.5 py-1 font-mono text-sm font-medium text-zinc-900 hover:bg-amber-300 disabled:opacity-50"
            >
              {isSavingToken ? <Loader2 size={13} className="animate-spin" /> : null}
              save
            </button>
          </div>
        </div>
      )}

      {/* ── Branch picker ── */}
      {showBranchPicker && (
        <div className="rounded border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/20">
          <div className="mb-2 flex items-center gap-2">
            <GitBranch size={12} className="shrink-0 text-indigo-500" />
            <p className="font-mono text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Choose target branch for PR
            </p>
          </div>
          {isFetchingBranches ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 size={13} className="animate-spin text-indigo-400" />
              <span className="font-mono text-xs text-indigo-500">fetching branches…</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="min-w-0 flex-1 rounded border border-indigo-200 bg-white px-2 py-1 font-mono text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-indigo-800/60 dark:bg-dark-tertiary dark:text-white"
              >
                {(branchData?.branches ?? []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleConfirmBranch}
                disabled={!selectedBranch}
                className="flex shrink-0 items-center gap-1 rounded bg-indigo-500 px-2.5 py-1 font-mono text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                <Play size={12} className="fill-white" />
                run
              </button>
              <button
                type="button"
                onClick={() => setShowBranchPicker(false)}
                className="shrink-0 rounded border border-indigo-200 px-2.5 py-1 font-mono text-sm text-indigo-600 hover:border-indigo-400 dark:border-indigo-800/60 dark:text-indigo-400"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Generic error ── */}
      {execError && !showTokenForm && (
        <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
          <p className="font-mono text-sm leading-relaxed text-red-600 dark:text-red-400">{execError}</p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ── PIPELINE PANEL ── */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {showPipeline && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-[#0d0f12] dark:border-[#1e2228]">
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#1e2228] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tracking-widest text-[#4a5568]">
                agent / task-{task._id.slice(-6)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isActive && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-[#4a5568]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  </span>
                  {formatElapsed(elapsedMs)}
                </span>
              )}
              {phase === "done" && (
                <span className="font-mono text-xs text-emerald-500">✓ complete</span>
              )}
              {phase === "failed" && (
                <span className="font-mono text-xs text-red-500">✗ failed</span>
              )}
              {phase === "cancelled" && (
                <span className="font-mono text-xs text-[#4a5568]">◼ cancelled</span>
              )}
            </div>
          </div>

          <div className="flex">
            {/* ── Vertical spine ── */}
            <div className="relative flex w-8 shrink-0 flex-col items-center py-4">
              {/* spine track */}
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#1e2228]" />
              {/* spine fill — grows as phases complete */}
              <SpineFill phase={phase} fileSteps={fileSteps} />
            </div>

            {/* ── Steps ── */}
            <div className="flex flex-1 flex-col gap-0 py-3 pr-3.5">
              {/* Files */}
              {fileSteps.map((f, i) => (
                <FileStepRow key={f.path} file={f} index={i} />
              ))}

              {/* Show a placeholder if no files extracted */}
              {fileSteps.length === 0 && isActive && (
                <PlaceholderRow label="reading plan…" active />
              )}

              {/* Commit */}
              <PhaseRow
                icon={<GitCommit size={14} />}
                label="git commit"
                state={
                  phase === "committing" ? "active"
                  : phase === "pushing" || phase === "pr" || phase === "done" ? "done"
                  : "waiting"
                }
              />

              {/* Push */}
              <PhaseRow
                icon={<GitBranch size={14} />}
                label="git push"
                state={
                  phase === "pushing" ? "active"
                  : phase === "pr" || phase === "done" ? "done"
                  : "waiting"
                }
              />

              {/* PR */}
              <PhaseRow
                icon={<GitPullRequest size={14} />}
                label="open pull request"
                state={
                  phase === "pr" ? "active"
                  : phase === "done" ? "done"
                  : "waiting"
                }
              />
            </div>
          </div>

          {/* ── Result footer ── */}
          {(phase === "done" || phase === "failed" || phase === "cancelled") && (
            <ResultFooter task={task} phase={phase} />
          )}
        </div>
      )}

      {/* Shimmer keyframe injection */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          60% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpineFill({ phase, fileSteps }: { phase: PipelinePhase; fileSteps: FileStep[] }) {
  const total = fileSteps.length + 3; // files + commit + push + pr
  const doneFiles = fileSteps.filter((f) => f.state === "done" || f.state === "failed").length;

  let filledSegments = doneFiles;
  if (phase === "committing") filledSegments = fileSteps.length + 0.5;
  else if (phase === "pushing") filledSegments = fileSteps.length + 1.5;
  else if (phase === "pr") filledSegments = fileSteps.length + 2.5;
  else if (phase === "done") filledSegments = total;

  const pct = total > 0 ? Math.min((filledSegments / total) * 100, 100) : 0;

  return (
    <div
      className="absolute left-1/2 top-4 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500 to-emerald-500 transition-all duration-700 ease-in-out"
      style={{ height: `${pct}%` }}
    />
  );
}

interface FileStepRowProps {
  file: FileStep;
  index: number;
}

function FileStepRow({ file }: FileStepRowProps) {
  const ext = fileExt(file.path);
  const color = extColor(ext);
  const isActive = file.state === "fetching" || file.state === "implementing" || file.state === "writing";
  const isDone = file.state === "done";
  const isFailed = file.state === "failed";
  const isWaiting = file.state === "waiting";

  return (
    <div className={`group flex items-center gap-2.5 py-1.5 pl-2 pr-1 transition-opacity duration-300 ${isWaiting ? "opacity-40" : "opacity-100"}`}>
      {/* Node */}
      <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-all duration-300"
        style={{
          borderColor: isDone ? "#10b981" : isFailed ? "#ef4444" : isActive ? "#6366f1" : "#1e2228",
          backgroundColor: isDone ? "#10b98115" : isFailed ? "#ef444415" : isActive ? "#6366f115" : "transparent",
        }}
      >
        {isDone && <CheckCircle size={13} className="text-emerald-500" />}
        {isFailed && <AlertCircle size={13} className="text-red-500" />}
        {isActive && <Loader2 size={12} className="animate-spin text-indigo-400" />}
        {isWaiting && <span className="h-1 w-1 rounded-full bg-[#2d3748]" />}
      </div>

      {/* File info */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <FileCode size={13} className={`shrink-0 ${color} opacity-70`} />
        <span className={`truncate font-mono text-sm ${isDone ? "text-[#4a5568]" : isActive ? "text-[#a0aec0]" : "text-[#2d3748]"}`}>
          {shortPath(file.path)}
        </span>
        <span className={`ml-auto shrink-0 font-mono text-xs tabular-nums transition-colors ${
          isDone ? "text-emerald-600" : isFailed ? "text-red-500" : isActive ? "text-indigo-400" : "text-[#2d3748]"
        }`}>
          {FILE_LABELS[file.state]}
        </span>
      </div>
    </div>
  );
}

function PhaseRow({
  icon, label, state,
}: {
  icon: React.ReactNode;
  label: string;
  state: "waiting" | "active" | "done";
}) {
  return (
    <div className={`flex items-center gap-2.5 py-1.5 pl-2 pr-1 transition-opacity duration-300 ${state === "waiting" ? "opacity-30" : "opacity-100"}`}>
      {/* Node */}
      <div
        className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded border transition-all duration-500"
        style={{
          borderColor: state === "done" ? "#10b981" : state === "active" ? "#6366f1" : "#1e2228",
          backgroundColor: state === "done" ? "#10b98115" : state === "active" ? "#6366f115" : "transparent",
        }}
      >
        {state === "done" && <CheckCircle size={13} className="text-emerald-500" />}
        {state === "active" && <Loader2 size={12} className="animate-spin text-indigo-400" />}
        {state === "waiting" && <span className="h-1 w-1 rounded-full bg-[#2d3748]" />}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`${state === "done" ? "text-emerald-600" : state === "active" ? "text-indigo-400" : "text-[#2d3748]"}`}>
          {icon}
        </span>
        <span className={`font-mono text-sm ${state === "done" ? "text-[#4a5568]" : state === "active" ? "text-[#a0aec0]" : "text-[#2d3748]"}`}>
          {label}
        </span>
        {state === "active" && (
          <span className="ml-auto flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1 w-1 animate-bounce rounded-full bg-indigo-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

function PlaceholderRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 pl-2 pr-1 opacity-50">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#1e2228]">
        {active ? <Loader2 size={12} className="animate-spin text-indigo-400" /> : <span className="h-1 w-1 rounded-full bg-[#2d3748]" />}
      </div>
      <span className="font-mono text-sm italic text-[#2d3748]">{label}</span>
    </div>
  );
}

function ResultFooter({ task, phase }: { task: Task; phase: PipelinePhase }) {
  if (phase === "done" && task.prUrl) {
    return (
      <div className="flex items-center justify-between border-t border-[#1e2228] bg-emerald-950/20 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-emerald-500" />
          <span className="font-mono text-sm text-emerald-400">PR opened — ready for review</span>
        </div>
        <a
          href={task.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded border border-emerald-800 bg-emerald-950/60 px-2.5 py-1 font-mono text-sm text-emerald-400 transition-colors hover:border-emerald-600 hover:text-emerald-300"
        >
          <ExternalLink size={13} />
          view PR
        </a>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="border-t border-[#1e2228] bg-red-950/20 px-3.5 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={14} className="shrink-0 text-red-500" />
          <span className="font-mono text-sm text-red-400">execution failed</span>
        </div>
        {task.executionLog && (
          <p className="font-mono text-xs leading-relaxed text-red-600/80 break-all">
            {task.executionLog}
          </p>
        )}
      </div>
    );
  }

  if (phase === "cancelled") {
    return (
      <div className="flex items-center gap-2 border-t border-[#1e2228] px-3.5 py-2.5">
        <Square size={13} className="text-[#4a5568]" />
        <span className="font-mono text-sm text-[#4a5568]">cancelled by user</span>
      </div>
    );
  }

  return null;
}
