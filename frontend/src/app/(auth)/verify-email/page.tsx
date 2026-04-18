"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle, Moon, Sun } from "lucide-react";
import { useGetCurrentUserQuery, useSendVerificationEmailMutation } from "@/state/api";
import { useAppDispatch, useAppSelector, getPersistor } from "@/app/redux";
import { setActiveWorkspaceId, setIsDarkMode } from "@/state";
import { api, useLogoutMutation } from "@/state/api";
import { useRouter } from "next/navigation";

export default function VerifyEmailPromptPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: currentUser } = useGetCurrentUserQuery();
  const [sendVerificationEmail, { isLoading }] = useSendVerificationEmailMutation();
  const [logout] = useLogoutMutation();

  const [sent, setSent] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setError("");
    try {
      const res = await sendVerificationEmail().unwrap();
      setSent(true);
      if (res.verifyUrl) setVerifyUrl(res.verifyUrl);
    } catch (err: any) {
      setError(err?.data?.message ?? "Failed to send verification email.");
    }
  };

  const handleSignOut = async () => {
    try { await logout().unwrap(); } catch {}
    dispatch(setActiveWorkspaceId(null));
    dispatch(api.util.resetApiState());
    await getPersistor().purge();
    router.push("/login");
  };

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

      <div className="relative w-full max-w-[420px]">
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

          {/* Icon + heading */}
          <div className="mb-8 flex flex-col items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center border border-amber-400/30 bg-amber-400/10">
              <Mail className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-gray-900 dark:text-white">Verify your email</h1>
              <div className="mt-3 h-px w-8 bg-amber-400" />
              <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
                You need to verify your email address before accessing the app.
                {currentUser?.email && (
                  <> We'll send a link to <span className="text-gray-700 dark:text-zinc-300">{currentUser.email}</span>.</>
                )}
              </p>
            </div>
          </div>

          {/* Sent state */}
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 border border-emerald-800 bg-emerald-950/40 px-4 py-4">
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                <p className="text-xs leading-relaxed text-emerald-400">
                  Verification email sent. Click the link in your inbox to continue.
                </p>
              </div>

              {/* Dev-mode helper: show the link directly */}
              {verifyUrl && (
                <div className="border border-gray-200 bg-white/60 px-4 py-3 dark:border-stroke-dark dark:bg-dark-bg/60">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                    Dev mode — verification link
                  </p>
                  <Link
                    href={verifyUrl}
                    className="break-all text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  >
                    {verifyUrl}
                  </Link>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-full border border-gray-200 px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-gray-500 transition-all hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stroke-dark dark:text-zinc-400"
              >
                {isLoading ? "Sending..." : "Resend email"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <div className="border border-red-800 bg-red-950/40 px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="w-full bg-amber-400 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    Sending...
                  </span>
                ) : (
                  "Send verification email"
                )}
              </button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-dark-bg">
            <Link
              href="/settings"
              className="text-xs text-zinc-600 transition-colors hover:text-amber-400"
            >
              ← Change email in settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-600 transition-colors hover:text-amber-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
