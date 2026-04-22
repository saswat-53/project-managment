"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";
import { useEffect } from "react";

export default function LandingNavActions() {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
        className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-dark-secondary dark:hover:text-white"
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <Link
        href="/login"
        className="px-4 py-2 text-sm uppercase tracking-[0.15em] text-gray-500 transition-colors hover:text-amber-400 dark:text-zinc-400"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="border border-amber-400 bg-transparent px-5 py-2 text-sm uppercase tracking-[0.15em] text-amber-400 transition-all hover:bg-amber-400 hover:text-zinc-950"
      >
        Get Started
      </Link>
    </div>
  );
}
