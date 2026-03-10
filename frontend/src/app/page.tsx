"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode } from "@/state";

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(400%); }
  }
  @keyframes pulse-amber {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1; }
  }
  @keyframes marquee {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .anim-fade-up   { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) both; }
  .anim-fade-in   { animation: fadeIn 0.6s ease both; }
  .delay-100 { animation-delay: 0.10s; }
  .delay-200 { animation-delay: 0.20s; }
  .delay-300 { animation-delay: 0.30s; }
  .delay-400 { animation-delay: 0.40s; }
  .delay-500 { animation-delay: 0.50s; }
  .delay-700 { animation-delay: 0.70s; }
  .delay-900 { animation-delay: 0.90s; }
  .marquee-track {
    display: flex;
    width: max-content;
    animation: marquee 28s linear infinite;
  }
  .scanline-bar {
    animation: scanline 3s linear infinite;
    opacity: 0.06;
  }
  .amber-pulse { animation: pulse-amber 2.5s ease-in-out infinite; }
`;

const SectionLabel = ({ children }: { children: string }) => (
  <p className="mb-4 text-xs uppercase tracking-[0.35em] text-gray-500 dark:text-zinc-500">
    {children}
  </p>
);

const AmberLine = ({ width = "w-8" }: { width?: string }) => (
  <div className={`h-px ${width} bg-amber-400`} />
);

const FeatureCard = ({
  index,
  title,
  desc,
  icon,
}: {
  index: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) => (
  <div className="group relative border border-gray-200 bg-gray-50/40 p-7 transition-all duration-300 hover:border-amber-400/40 hover:bg-gray-50/80 dark:border-stroke-dark dark:bg-dark-secondary/40 dark:hover:bg-dark-secondary/80">
    <div className="absolute -left-px -top-px h-4 w-4 border-l border-t border-amber-400/0 transition-all duration-300 group-hover:border-amber-400/60" />
    <div className="absolute -bottom-px -right-px h-4 w-4 border-b border-r border-amber-400/0 transition-all duration-300 group-hover:border-amber-400/60" />
    <div className="mb-5 flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center border border-gray-200 text-amber-400 transition-colors group-hover:border-amber-400/40 dark:border-stroke-dark">
        {icon}
      </div>
      <span className="font-mono text-xs text-zinc-700">{index}</span>
    </div>
    <h3 className="mb-2 font-mono text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="font-mono text-sm leading-relaxed text-gray-500 dark:text-zinc-500">{desc}</p>
  </div>
);

/* ── Mock task board UI (decorative hero graphic) ────────── */
const MockBoard = () => (
  <div className="relative h-full w-full overflow-hidden border border-gray-200 bg-gray-50/60 font-mono dark:border-stroke-dark dark:bg-dark-secondary/60">
    <div className="scanline-bar pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-amber-400 to-transparent" />

    {/* top bar */}
    <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-stroke-dark">
      <div className="flex h-5 w-5 items-center justify-center border border-amber-400">
        <div className="h-1.5 w-1.5 bg-amber-400" />
      </div>
      <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-zinc-400">
        ProjectFlow
      </span>
      <div className="ml-auto flex gap-1.5">
        <div className="h-2 w-2 rounded-full bg-gray-100 dark:bg-dark-secondary" />
        <div className="h-2 w-2 rounded-full bg-gray-100 dark:bg-dark-secondary" />
        <div className="h-2 w-2 rounded-full bg-amber-400/60" />
      </div>
    </div>

    {/* columns */}
    <div className="flex h-[calc(100%-44px)] gap-0 divide-x divide-gray-100 overflow-hidden dark:divide-dark-bg">
      {/* Todo */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b border-gray-200 px-3 py-2 dark:border-stroke-dark">
          <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Todo</span>
          <span className="ml-2 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-secondary dark:text-zinc-400">3</span>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
          {["Design system audit", "API integration", "Write tests"].map((t, i) => (
            <div
              key={t}
              className="border border-gray-200 bg-white px-3 py-2.5 dark:border-stroke-dark dark:bg-dark-bg"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <p className="text-xs text-gray-500 dark:text-zinc-400">{t}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-gray-100 dark:bg-dark-secondary" />
                <span className="text-[10px] text-zinc-600">{["Mar 10", "Mar 12", "Mar 14"][i]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In Progress */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b border-gray-200 px-3 py-2 dark:border-stroke-dark">
          <span className="text-xs uppercase tracking-[0.2em] text-amber-400/70">In Progress</span>
          <span className="ml-2 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400/60">2</span>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
          {["Auth flow refactor", "Dashboard widgets"].map((t, i) => (
            <div key={t} className="border border-amber-400/20 bg-white px-3 py-2.5 dark:bg-dark-bg">
              <p className="text-xs text-zinc-300">{t}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-amber-400/50" />
                <span className="text-[10px] text-zinc-600">{["Mar 8", "Mar 9"][i]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Done */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b border-gray-200 px-3 py-2 dark:border-stroke-dark">
          <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Done</span>
          <span className="ml-2 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-secondary dark:text-zinc-400">5</span>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
          {["Workspace setup", "Member invites", "Project creation", "Task board", "Dark mode"].map(
            (t, i) => (
              <div
                key={t}
                className="border border-gray-200 bg-white px-3 py-2 dark:border-stroke-dark dark:bg-dark-bg"
                style={{ opacity: 0.5 - i * 0.06 }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-1 bg-zinc-600" />
                  <p className="text-xs text-zinc-600 line-through">{t}</p>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  </div>
);

export default function LandingPage() {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <>
      <style>{STYLES}</style>

      <div className="min-h-screen bg-white font-mono text-gray-900 dark:bg-dark-bg dark:text-white">
        {/* ambient grid */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* ── NAV ─────────────────────────────────────────── */}
        <nav className="anim-fade-in sticky top-0 z-50 flex items-center justify-between border-b border-gray-200/60 bg-white/90 px-6 py-4 backdrop-blur-md dark:border-stroke-dark/60 dark:bg-dark-bg/90 md:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-amber-400">
              <div className="h-3 w-3 bg-amber-400" />
            </div>
            <span className="text-base font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              ProjectFlow
            </span>
          </div>
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
        </nav>

        {/* ── HERO ────────────────────────────────────────── */}
        <section className="relative flex min-h-[calc(100vh-57px)] flex-col items-start justify-center overflow-hidden px-6 py-24 md:px-12 lg:flex-row lg:items-center lg:gap-16 lg:px-20">
          {/* Left — copy */}
          <div className="relative z-10 flex-1 lg:max-w-[560px]">
            <div className="anim-fade-up mb-5 flex items-center gap-3">
              <div className="h-px w-8 bg-amber-400" />
              <span className="text-sm uppercase tracking-[0.3em] text-amber-400">
                Project Intelligence
              </span>
            </div>

            <h1 className="anim-fade-up delay-100 mb-7 text-5xl font-light leading-[1.08] tracking-tight text-gray-900 dark:text-white md:text-6xl lg:text-7xl">
              Ship work
              <br />
              that{" "}
              <span className="relative inline-block">
                matters
                <span className="absolute -bottom-1 left-0 h-px w-full bg-amber-400" />
              </span>
              <span className="text-zinc-600">.</span>
            </h1>

            <p className="anim-fade-up delay-200 mb-10 max-w-md text-base leading-relaxed text-gray-500 dark:text-zinc-400">
              Workspaces, projects, tasks, and team collaboration — unified in
              one sharp, distraction-free tool. From backlog to done, with
              complete visibility.
            </p>

            <div className="anim-fade-up delay-300 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="bg-amber-400 px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-zinc-950 transition-all duration-200 hover:bg-amber-300"
              >
                Start for free
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-gray-500 transition-colors hover:text-amber-400 dark:text-zinc-500"
              >
                Sign in
                <span className="text-amber-400">→</span>
              </Link>
            </div>

            {/* Stats row */}
            <div className="anim-fade-up delay-500 mt-14 flex gap-10 border-t border-gray-200 pt-8 dark:border-stroke-dark">
              {[
                { n: "3", label: "Task views" },
                { n: "∞", label: "Workspaces" },
                { n: "RT", label: "Collaboration" },
              ].map(({ n, label }) => (
                <div key={label}>
                  <p className="text-3xl font-light text-amber-400">{n}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock board */}
          <div className="anim-fade-up delay-400 relative mt-16 w-full lg:mt-0 lg:flex-1 lg:max-w-[580px]">
            <div className="absolute -left-3 -top-3 h-8 w-8 border-l-2 border-t-2 border-amber-400/50" />
            <div className="absolute -bottom-3 -right-3 h-8 w-8 border-b-2 border-r-2 border-amber-400/50" />
            <div className="absolute -inset-px bg-amber-400/5" />
            <div className="relative h-[420px] w-full lg:h-[500px]">
              <MockBoard />
            </div>
          </div>

          {/* bg accents */}
          <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rotate-45 border border-amber-400/5" />
          <div className="absolute bottom-12 left-[45%] h-2 w-2 rounded-full bg-amber-400 amber-pulse" />
          <div className="absolute left-[55%] top-16 h-1.5 w-1.5 rounded-full bg-amber-400/40 amber-pulse delay-700" />
        </section>

        {/* ── TICKER ──────────────────────────────────────── */}
        <div className="overflow-hidden border-y border-gray-200 bg-gray-50/40 py-4 dark:border-stroke-dark dark:bg-dark-secondary/40">
          <div className="marquee-track">
            {[...Array(2)].map((_, pass) => (
              <div key={pass} className="flex items-center gap-0">
                {[
                  "Workspaces", "Projects", "Task Boards", "Kanban",
                  "List View", "Table View", "Timeline", "Team Members",
                  "Role Management", "Dark Mode", "Real-time Updates", "Invite Codes",
                ].map((item) => (
                  <span
                    key={`${pass}-${item}`}
                    className="flex items-center gap-6 px-8 text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-zinc-500"
                  >
                    <span className="h-px w-3 bg-amber-400/40" />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ────────────────────────────────────── */}
        <section className="px-6 py-28 md:px-12 lg:px-20">
          <div className="mb-16">
            <SectionLabel>Core capabilities</SectionLabel>
            <AmberLine />
            <h2 className="mt-6 text-4xl font-light leading-tight text-gray-900 dark:text-white md:text-5xl">
              Everything your team
              <br />
              <span className="text-gray-500 dark:text-zinc-500">needs to execute.</span>
            </h2>
          </div>

          <div className="grid gap-px border border-gray-200 bg-gray-50 dark:border-stroke-dark dark:bg-dark-secondary sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                index: "01",
                title: "Workspaces",
                desc: "Isolated environments for each organisation, team, or client. Switch contexts instantly with a single click.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="1" y="1" width="6" height="6" /><rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" />
                  </svg>
                ),
              },
              {
                index: "02",
                title: "Projects",
                desc: "Organise work into focused projects with statuses — active, planning, on hold, or completed.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2 2h12v3H2zM2 7h7v7H2zM11 7h3v7h-3z" />
                  </svg>
                ),
              },
              {
                index: "03",
                title: "Task Boards",
                desc: "Kanban board with Todo, In Progress, and Done columns. Drag, update, and track every work item.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M1 1h4v14H1zM6 1h4v9H6zM11 1h4v12h-4z" />
                  </svg>
                ),
              },
              {
                index: "04",
                title: "Multiple Views",
                desc: "Switch between Board, List, and Table views. Each view designed for a different way of thinking.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M1 4h14M1 8h14M1 12h14" strokeLinecap="square" />
                  </svg>
                ),
              },
              {
                index: "05",
                title: "Team Collaboration",
                desc: "Invite members via unique workspace codes. Assign tasks, see who owns what, and track progress together.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="5" cy="5" r="3" /><circle cx="11" cy="5" r="3" />
                    <path d="M1 14c0-2.2 1.8-4 4-4M10 14c0-2.2 1.8-4 4-4M7 10c1.1 0 2 .4 2.7 1" />
                  </svg>
                ),
              },
              {
                index: "06",
                title: "Dashboard Analytics",
                desc: "Project status charts and full task overview at a glance. Understand your team's throughput instantly.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M1 13V7l3-3 3 3 3-5 3 3v8H1z" />
                  </svg>
                ),
              },
            ].map((f) => (
              <FeatureCard key={f.index} {...f} />
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section className="border-t border-gray-200 px-6 py-28 dark:border-stroke-dark md:px-12 lg:px-20">
          <div className="mb-16">
            <SectionLabel>Workflow</SectionLabel>
            <AmberLine />
            <h2 className="mt-6 text-4xl font-light text-gray-900 dark:text-white md:text-5xl">
              Up and running
              <br />
              <span className="text-gray-500 dark:text-zinc-500">in three steps.</span>
            </h2>
          </div>

          <div className="grid gap-0 divide-y divide-gray-100 dark:divide-dark-bg lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {[
              {
                n: "I",
                title: "Create a workspace",
                desc: "Register your account and set up a workspace for your team. Share the invite code with teammates.",
              },
              {
                n: "II",
                title: "Start a project",
                desc: "Create projects inside your workspace, define scope, add members, and set a status.",
              },
              {
                n: "III",
                title: "Ship tasks",
                desc: "Break work into tasks, assign owners, set due dates, and move them from Todo → Done.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="group relative p-10 transition-colors hover:bg-gray-50/40 dark:hover:bg-dark-secondary/40">
                <div className="mb-6 font-mono text-6xl font-light text-zinc-800 transition-colors group-hover:text-amber-400/20">
                  {n}
                </div>
                <AmberLine width="w-8" />
                <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ──────────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-gray-200 px-6 py-28 dark:border-stroke-dark md:px-12 lg:px-20">
          <div className="absolute right-12 top-1/2 h-48 w-48 -translate-y-1/2 rotate-45 border border-amber-400/8" />
          <div className="absolute right-24 top-1/2 h-32 w-32 -translate-y-1/2 rotate-45 border border-amber-400/12" />
          <div className="absolute left-[60%] top-8 h-2 w-2 rounded-full bg-amber-400/40 amber-pulse" />

          <div className="relative max-w-xl">
            <SectionLabel>Ready to ship?</SectionLabel>
            <AmberLine />
            <h2 className="mt-6 text-4xl font-light leading-tight text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
              Your team's work
              <br />
              deserves better
              <br />
              <span className="text-amber-400">tools.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-gray-500 dark:text-zinc-400">
              No credit card. No setup fee. Just sign up and start shipping.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-amber-400 px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-zinc-950 transition-all hover:bg-amber-300"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="border border-gray-200 px-8 py-4 text-sm uppercase tracking-[0.15em] text-gray-500 transition-all hover:border-zinc-500 hover:text-zinc-200 dark:border-stroke-dark dark:text-zinc-400"
              >
                Sign in →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────── */}
        <footer className="border-t border-gray-200 px-6 py-8 dark:border-stroke-dark md:px-12 lg:px-20">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center border border-amber-400/60">
                <div className="h-2.5 w-2.5 bg-amber-400/60" />
              </div>
              <span className="text-sm uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                ProjectFlow
              </span>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Coordinate. Ship. Iterate.
            </p>
            <div className="flex gap-6">
              <Link href="/login" className="text-sm text-zinc-600 transition-colors hover:text-amber-400">
                Sign In
              </Link>
              <Link href="/register" className="text-sm text-zinc-600 transition-colors hover:text-amber-400">
                Register
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
