"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForgotPasswordMutation } from "@/state/api";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await forgotPassword({ email }).unwrap();
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.data?.message || "Something went wrong. Please try again.");
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
            <h1 className="text-2xl font-light text-gray-900 dark:text-white">Reset password</h1>
            <div className="mt-3 h-px w-8 bg-amber-400" />
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="border border-emerald-800 bg-emerald-950/40 px-4 py-6">
              <p className="text-sm text-emerald-400">
                If an account exists for <span className="font-semibold">{email}</span>, a password reset link has been sent.
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                Check your inbox (and spam folder).
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-stroke-dark dark:bg-dark-bg dark:text-white dark:placeholder-zinc-600"
                />
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
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-gray-100 pt-8 dark:border-dark-bg">
            <p className="text-xs text-zinc-600">
              Remembered it?{" "}
              <Link href="/login" className="text-amber-400 transition-colors hover:text-amber-300">
                Back to sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
