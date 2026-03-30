"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRegisterMutation } from "@/state/api";

export default function RegisterPage() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register({ name, email, password }).unwrap();
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err?.data?.message || "Registration failed. Please try again.");
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
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center border-2 border-amber-400">
                <div className="h-2.5 w-2.5 bg-amber-400" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">
                ProjectFlow
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[14px] uppercase tracking-[0.15em] text-zinc-500 transition-colors hover:text-amber-400"
            >
              <ArrowLeft size={12} />
              Home
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-gray-900 dark:text-white">
              Create account
            </h1>
            <div className="mt-3 h-px w-8 bg-amber-400" />
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500">
              Join your team's workspace
            </p>
          </div>

          {success ? (
            <div className="border border-emerald-800 bg-emerald-950/40 px-4 py-6 text-center">
              <p className="text-sm text-emerald-400">
                Account created! Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Alex Kim"
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
                />
              </div>

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
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
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
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-gray-200 pt-8 dark:border-stroke-dark">
            <p className="text-xs text-zinc-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-amber-400 transition-colors hover:text-amber-300"
              >
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
