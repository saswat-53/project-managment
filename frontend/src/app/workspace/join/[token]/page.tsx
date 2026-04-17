"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader, Moon, Sun, XCircle } from "lucide-react";
import { useGetCurrentUserQuery, useJoinWorkspaceMutation } from "@/state/api";
import { setActiveWorkspaceId, setIsDarkMode } from "@/state";
import { useAppDispatch, useAppSelector } from "@/app/redux";

type Props = {
  params: { token: string };
};

export default function JoinWorkspacePage({ params }: Props) {
  const { token } = params;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // Sync dark class to <html> — required for standalone pages outside DashboardWrapper
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const { data: currentUser, isLoading: isAuthLoading, isError: isAuthError } =
    useGetCurrentUserQuery();

  const [joinWorkspace, { isLoading: isJoining }] = useJoinWorkspaceMutation();

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && (isAuthError || !currentUser)) {
      router.push("/login");
    }
  }, [isAuthLoading, isAuthError, currentUser, router]);

  const handleJoin = async () => {
    try {
      const result = await joinWorkspace(token).unwrap();
      dispatch(setActiveWorkspaceId(result.workspace._id));
      setStatus("success");
      setMessage(result.message);
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.data?.message || "Failed to join workspace.");
    }
  };

  // Auth loading
  if (isAuthLoading || (!isAuthError && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-mono dark:bg-dark-bg">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
      </div>
    );
  }

  // Not authenticated — useEffect will redirect
  if (isAuthError || !currentUser) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 font-mono dark:bg-dark-bg">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Dark mode toggle */}
      <button
        onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
        className="fixed right-4 top-4 z-50 rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-dark-secondary dark:hover:text-white"
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative w-full max-w-[400px]">
        {/* Corner accents */}
        <div className="absolute -left-4 -top-4 h-8 w-8 border-l-2 border-t-2 border-amber-400/50" />
        <div className="absolute -bottom-4 -right-4 h-8 w-8 border-b-2 border-r-2 border-amber-400/50" />

        <div className="border border-gray-200 bg-gray-50/80 p-10 backdrop-blur-sm dark:border-stroke-dark dark:bg-dark-secondary/80">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-amber-400">
              <div className="h-2.5 w-2.5 bg-amber-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              ProjectFlow
            </span>
          </div>

          {/* ── Idle: show invite acceptance UI ── */}
          {status === "idle" && (
            <>
              <div className="mb-8">
                <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-500">
                  — Workspace invite
                </p>
                <h1 className="text-2xl font-light text-gray-900 dark:text-white">
                  You've been{" "}
                  <span className="text-amber-400">invited</span>
                </h1>
                <div className="mt-3 h-px w-8 bg-amber-400" />
              </div>

              <p className="mb-8 text-sm leading-relaxed text-gray-500 dark:text-zinc-400">
                Signed in as{" "}
                <span className="text-gray-900 dark:text-white">{currentUser.email}</span>.
                Click below to accept and join the workspace.
              </p>

              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="group relative w-full overflow-hidden bg-amber-400 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-950 transition-all duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    Joining...
                  </span>
                ) : (
                  "Accept Invite →"
                )}
              </button>
            </>
          )}

          {/* ── Joining spinner ── */}
          {status === "idle" && isJoining && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Loader className="h-5 w-5 animate-spin text-amber-400" />
            </div>
          )}

          {/* ── Success ── */}
          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-400">Joined successfully!</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  {message} — redirecting to dashboard...
                </p>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <XCircle className="h-10 w-10 text-red-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-red-400">Could not join</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{message}</p>
              </div>
              <button
                onClick={() => { setStatus("idle"); setMessage(""); }}
                className="mt-2 w-full border border-amber-400 px-6 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-400 transition-all hover:bg-amber-400 hover:text-zinc-950"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-dark-bg">
            <p className="text-xs text-zinc-600">
              <Link href="/workspaces" className="text-amber-400 transition-colors hover:text-amber-300">
                ← My workspaces
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
