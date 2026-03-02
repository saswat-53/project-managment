"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLoginMutation } from "@/state/api";
import { setActiveWorkspaceId } from "@/state";
import { useAppDispatch } from "@/app/redux";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password }).unwrap();
      dispatch(setActiveWorkspaceId(null));
      router.push("/workspaces");
    } catch (err: any) {
      setError(err?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 font-mono">
      {/* ── Left Panel — geometric art ─────────────────────── */}
      <div
        className="relative hidden w-[46%] overflow-hidden lg:flex"
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)" }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Geometric shapes */}
        <div className="absolute left-12 top-12 h-32 w-32 rotate-45 border-2 border-amber-400/30" />
        <div className="absolute left-24 top-24 h-32 w-32 rotate-45 border border-amber-400/15" />
        <div className="absolute bottom-20 right-8 h-48 w-48 rounded-full border border-amber-400/10" />
        <div className="absolute bottom-28 right-16 h-32 w-32 rounded-full border-2 border-amber-400/20" />
        <div className="absolute left-[40%] top-[38%] h-2 w-2 rounded-full bg-amber-400" />
        <div className="absolute left-[30%] top-[55%] h-1 w-1 rounded-full bg-amber-400/60" />
        <div className="absolute left-[55%] top-[28%] h-1.5 w-1.5 rounded-full bg-amber-400/40" />
        {/* Diagonal accent line */}
        <div
          className="absolute left-0 top-0 h-full w-px origin-top-left bg-gradient-to-b from-transparent via-amber-400/30 to-transparent"
          style={{ transform: "translateX(calc(46vw - 1px)) rotate(15deg)", width: "1px", height: "150%" }}
        />
        {/* Brand stamp */}
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">
            Project Intelligence
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Coordinate. Ship. Iterate.
          </p>
        </div>
        {/* Center quote */}
        <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2">
          <div className="mb-6 h-px w-12 bg-amber-400" />
          <p className="text-2xl font-light leading-relaxed text-zinc-200">
            Every great project<br />
            starts with a<br />
            <span className="text-amber-400">single sign-in.</span>
          </p>
        </div>
      </div>

      {/* ── Right Panel — form ──────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border-2 border-amber-400">
                <div className="h-3 w-3 bg-amber-400" />
              </div>
              <span className="text-lg font-bold tracking-widest text-white uppercase">
                ProjectFlow
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-3xl font-light text-white">
              Welcome<br />
              <span className="text-zinc-500">back.</span>
            </h1>
            <div className="mt-4 h-px w-8 bg-amber-400" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-0"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-0"
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
              className="group relative mt-2 w-full overflow-hidden bg-amber-400 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-zinc-950 transition-all duration-200 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 border-t border-zinc-800 pt-8">
            <p className="text-xs text-zinc-600">
              No account?{" "}
              <Link
                href="/register"
                className="text-amber-400 transition-colors hover:text-amber-300"
              >
                Create one →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
