"use client";

import React, { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader, Moon, Sun } from "lucide-react";
import { useVerifyEmailMutation } from "@/state/api";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [verifyEmail, { isLoading, isSuccess, isError }] = useVerifyEmailMutation();
  const called = useRef(false);

  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (token && !called.current) {
      called.current = true;
      verifyEmail(token);
    }
  }, []);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => router.push("/workspaces"), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

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
            <h1 className="text-2xl font-light text-gray-900 dark:text-white">Email verification</h1>
            <div className="mt-3 h-px w-8 bg-amber-400" />
          </div>

          {/* States */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader className="h-8 w-8 animate-spin text-amber-400" />
              <p className="text-sm text-gray-500 dark:text-zinc-400">Verifying your email...</p>
            </div>
          )}

          {isSuccess && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-400">Email verified!</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  Redirecting you to the app...
                </p>
              </div>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-4 py-6">
              <XCircle className="h-10 w-10 text-red-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-red-400">Verification failed</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                  This link is invalid or has expired. Request a new one from your settings.
                </p>
              </div>
              <Link
                href="/settings"
                className="mt-2 w-full border border-amber-400 px-6 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-amber-400 transition-all hover:bg-amber-400 hover:text-zinc-950"
              >
                Go to settings
              </Link>
            </div>
          )}

          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-dark-bg">
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
