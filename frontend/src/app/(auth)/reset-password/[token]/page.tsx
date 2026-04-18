"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useResetPasswordMutation } from "@/state/api";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      await resetPassword({ token, newPassword }).unwrap();
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err?.data?.message || "Invalid or expired reset link.");
    }
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

      <div className="relative w-full max-w-[380px]">
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

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-gray-900 dark:text-white">New password</h1>
            <div className="mt-3 h-px w-8 bg-amber-400" />
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500">
              Choose a strong password for your account.
            </p>
          </div>

          {success ? (
            <div className="border border-emerald-800 bg-emerald-950/40 px-4 py-6">
              <p className="text-sm text-emerald-400">Password reset successfully!</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">Redirecting to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-stroke-dark dark:bg-dark-bg dark:text-white dark:placeholder-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-amber-400"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-stroke-dark dark:bg-dark-bg dark:text-white dark:placeholder-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-amber-400"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="border border-red-800 bg-red-950/40 px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full bg-amber-400 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-gray-100 pt-8 dark:border-dark-bg">
            <p className="text-xs text-zinc-600">
              <Link href="/login" className="text-amber-400 transition-colors hover:text-amber-300">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
