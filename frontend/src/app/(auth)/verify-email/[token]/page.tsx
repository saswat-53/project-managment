"use client";

import React, { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { useVerifyEmailMutation } from "@/state/api";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [verifyEmail, { isLoading, isSuccess, isError }] = useVerifyEmailMutation();
  const called = useRef(false);

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 font-mono">
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

        <div className="border border-zinc-800 bg-zinc-900/80 p-10 backdrop-blur-sm">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-amber-400">
              <div className="h-2.5 w-2.5 bg-amber-400" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white">
              ProjectFlow
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-light text-white">Email verification</h1>
            <div className="mt-3 h-px w-8 bg-amber-400" />
          </div>

          {/* States */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader className="h-8 w-8 animate-spin text-amber-400" />
              <p className="text-sm text-zinc-400">Verifying your email...</p>
            </div>
          )}

          {isSuccess && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-400">Email verified!</p>
                <p className="mt-1 text-xs text-zinc-500">
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
                <p className="mt-1 text-xs text-zinc-500">
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

          <div className="mt-8 border-t border-zinc-800 pt-6">
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
