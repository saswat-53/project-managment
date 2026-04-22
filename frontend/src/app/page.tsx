import Link from "next/link";
import LandingNavActions from "./LandingNavActions";

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
  badge,
}: {
  index: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}) => (
  <div className="group relative border border-gray-200 bg-gray-50/40 p-7 transition-all duration-300 hover:border-amber-400/40 hover:bg-gray-50/80 dark:border-stroke-dark dark:bg-dark-secondary/40 dark:hover:bg-dark-secondary/80">
    <div className="absolute -left-px -top-px h-4 w-4 border-l border-t border-amber-400/0 transition-all duration-300 group-hover:border-amber-400/60" />
    <div className="absolute -bottom-px -right-px h-4 w-4 border-b border-r border-amber-400/0 transition-all duration-300 group-hover:border-amber-400/60" />
    <div className="mb-5 flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center border border-gray-200 text-amber-400 transition-colors group-hover:border-amber-400/40 dark:border-stroke-dark">
        {icon}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-amber-400">
            {badge}
          </span>
        )}
        <span className="font-mono text-xs text-zinc-700">{index}</span>
      </div>
    </div>
    <h3 className="mb-3 font-mono text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    <p className="font-mono text-base leading-relaxed text-gray-700 dark:text-zinc-300">{desc}</p>
  </div>
);

const MockBoard = () => (
  <div className="relative h-full w-full overflow-hidden border border-gray-200 bg-gray-50/60 font-mono dark:border-stroke-dark dark:bg-dark-secondary/60">
    <div className="scanline-bar pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-amber-400 to-transparent" />

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

    <div className="flex h-[calc(100%-44px)] gap-0 divide-x divide-gray-100 overflow-hidden dark:divide-dark-bg">
      {/* Todo */}
      <div className="flex w-1/3 flex-col">
        <div className="border-b border-gray-200 px-3 py-2 dark:border-stroke-dark">
          <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Todo</span>
          <span className="ml-2 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-secondary dark:text-zinc-400">3</span>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden p-2">
          {(["Design system audit", "API integration", "Write tests"] as const).map((t, i) => (
            <div
              key={t}
              className="border border-gray-200 bg-white px-3 py-2.5 dark:border-stroke-dark dark:bg-dark-bg"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <p className="text-xs text-gray-500 dark:text-zinc-400">{t}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-gray-100 dark:bg-dark-secondary" />
                <span className="text-[10px] text-zinc-600">{(["Mar 10", "Mar 12", "Mar 14"] as const)[i]}</span>
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
          {(["Auth flow refactor", "Dashboard widgets"] as const).map((t, i) => (
            <div key={t} className="border border-amber-400/20 bg-white px-3 py-2.5 dark:bg-dark-bg">
              <p className="text-xs text-zinc-300">{t}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-amber-400/50" />
                <span className="text-[10px] text-zinc-600">{(["Mar 8", "Mar 9"] as const)[i]}</span>
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
          {(["Workspace setup", "Member invites", "Project creation", "Task board", "Dark mode"] as const).map(
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

/* ── AI two-panel mock screen ──────────────────────── */
const AiPlanMock = () => (
  <div className="relative h-full w-full overflow-hidden border border-gray-200 bg-white font-mono dark:border-stroke-dark dark:bg-dark-secondary/60">
    <div className="scanline-bar pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-amber-400 to-transparent" />

    {/* App chrome bar */}
    <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-stroke-dark dark:bg-dark-bg/80">
      <div className="flex h-5 w-5 items-center justify-center border border-amber-400">
        <div className="h-1.5 w-1.5 bg-amber-400" />
      </div>
      <span className="text-sm uppercase tracking-widest text-gray-500 dark:text-zinc-400">ProjectFlow</span>
      <div className="mx-3 h-3 w-px bg-gray-200 dark:bg-stroke-dark" />
      <span className="text-sm text-gray-500 dark:text-zinc-400">Auth flow refactor</span>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-amber" />
          <span className="text-xs uppercase tracking-widest text-amber-400/80">executing</span>
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-100 dark:bg-dark-secondary" />
          <div className="h-2 w-2 rounded-full bg-gray-100 dark:bg-dark-secondary" />
          <div className="h-2 w-2 rounded-full bg-amber-400/60" />
        </div>
      </div>
    </div>

    {/* Tab bar */}
    <div className="flex border-b border-gray-200 dark:border-stroke-dark">
      <div className="border-b-2 border-amber-400 px-4 py-2">
        <span className="text-xs uppercase tracking-[0.2em] text-amber-400">Plan</span>
      </div>
      <div className="px-4 py-2">
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Executor</span>
      </div>
      <div className="px-4 py-2">
        <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">Task</span>
      </div>
    </div>

    {/* Two-panel body */}
    <div className="flex h-[calc(100%-88px)] divide-x divide-gray-100 dark:divide-stroke-dark">

      {/* LEFT — plan.md viewer */}
      <div className="flex w-1/2 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-3 py-2 dark:border-stroke-dark/50 dark:bg-dark-bg/40">
          <svg className="h-3 w-3 text-amber-400/70" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 1h8v10H2z" /><path d="M4 4h4M4 6h4M4 8h2" strokeLinecap="round" />
          </svg>
          <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">plan.md</span>
          <div className="ml-auto text-xs text-gray-400 dark:text-zinc-500">generated 2m ago</div>
        </div>
        <div className="overflow-hidden p-3 text-xs leading-relaxed">
          {/* Objective */}
          <div className="mb-2.5">
            <span className="text-amber-400/80"># </span>
            <span className="font-semibold text-gray-900 dark:text-white">Auth Flow Refactor</span>
          </div>
          <div className="mb-3 text-gray-600 dark:text-zinc-400">
            Migrate JWT storage from localStorage to HTTP-only cookies, add token refresh middleware, and update all auth controllers accordingly.
          </div>
          {/* Files to change */}
          <div className="mb-1.5">
            <span className="text-amber-400/80">## </span>
            <span className="text-gray-800 dark:text-zinc-200">Files to Change</span>
          </div>
          <div className="mb-3 overflow-hidden rounded border border-gray-100 dark:border-stroke-dark">
            <div className="flex border-b border-gray-100 bg-gray-50/60 px-2 py-1 dark:border-stroke-dark dark:bg-dark-bg/60">
              <span className="w-1/2 text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">File</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-400">Change</span>
            </div>
            {[
              { file: "auth.controller.ts", change: "Set HTTP-only cookie on login" },
              { file: "auth.middleware.ts", change: "Read token from cookies" },
              { file: "jwt.ts", change: "Add refresh token helper" },
              { file: "user.model.ts", change: "Remove tokenVersion field" },
            ].map((r, i) => (
              <div
                key={r.file}
                className="flex border-b border-gray-50 px-2 py-1.5 dark:border-stroke-dark/30"
                style={{ opacity: 1 - i * 0.1 }}
              >
                <span className="w-1/2 truncate text-blue-600 dark:text-blue-400">{r.file}</span>
                <span className="truncate text-gray-600 dark:text-zinc-400">{r.change}</span>
              </div>
            ))}
          </div>
          {/* Steps */}
          <div className="mb-1.5">
            <span className="text-amber-400/80">## </span>
            <span className="text-gray-800 dark:text-zinc-200">Steps</span>
          </div>
          <div className="space-y-1">
            {[
              "1. Update login handler to set res.cookie()",
              "2. Middleware reads req.cookies.token",
              "3. Add /auth/refresh endpoint",
              "4. Remove localStorage calls from client",
            ].map((s) => (
              <div key={s} className="flex items-start gap-1.5 text-gray-600 dark:text-zinc-400">
                <span className="mt-0.5 h-1 w-1 flex-shrink-0 bg-amber-400/60" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — agent executor trace */}
      <div className="flex w-1/2 flex-col overflow-hidden bg-gray-950">
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <svg className="h-3 w-3 text-amber-400/60" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 1l1.5 3.5L11 5 8.5 7.5l.5 3.5L6 9.5 3 11l.5-3.5L1 5l3.5-.5z" />
          </svg>
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">agent executor</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-amber" />
            <span className="text-xs text-amber-400/80">running</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-3 text-xs leading-relaxed">
          <div className="space-y-1.5">
            <div className="text-zinc-500">$ agent-exec --task 47 --repo myapp</div>
            <div className="text-zinc-400">→ Parsing plan.md…</div>
            <div className="text-zinc-400">→ Found 4 files to modify</div>
            <div className="mt-1 text-zinc-400">→ Fetching from GitHub (4/31 files)…</div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>auth.controller.ts</span>
              <span className="ml-auto text-zinc-500">fetched</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>auth.middleware.ts</span>
              <span className="ml-auto text-zinc-500">fetched</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>jwt.ts</span>
              <span className="ml-auto text-zinc-500">fetched</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>user.model.ts</span>
              <span className="ml-auto text-zinc-500">fetched</span>
            </div>
            <div className="mt-1 text-zinc-400">→ Rewriting via DeepSeek…</div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>auth.controller.ts</span>
              <span className="ml-auto text-green-400">written</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-green-400">✓</span>
              <span>auth.middleware.ts</span>
              <span className="ml-auto text-green-400">written</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <span className="text-amber-400">↻</span>
              <span className="text-amber-400">jwt.ts</span>
              <span className="ml-auto text-amber-400">writing…</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span>·</span>
              <span>user.model.ts</span>
              <span className="ml-auto text-zinc-600">queued</span>
            </div>
            <div className="mt-1 text-zinc-400">→ Committing to branch…</div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <span>·</span>
              <span className="text-amber-400/60">agent/auth-refactor-47</span>
            </div>
            <div className="text-zinc-400">→ Opening PR…</div>
            <div className="mt-1 flex items-center gap-1.5 text-zinc-500">
              <span>·</span>
              <span>awaiting completion</span>
              <div className="ml-auto flex gap-0.5">
                <div className="h-1 w-1 rounded-full bg-amber-400/40 pulse-amber" />
                <div className="h-1 w-1 rounded-full bg-amber-400/30 pulse-amber delay-200" />
                <div className="h-1 w-1 rounded-full bg-amber-400/20 pulse-amber delay-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
);

/* ── Notification inbox mock ────────────────────────── */
const NotifInboxMock = () => {
  const emails = [
    {
      icon: "✉",
      color: "text-amber-400 bg-amber-400/10",
      subject: "Daily Task Digest",
      preview: "2 overdue · 3 due soon",
      time: "00:00",
      unread: true,
    },
    {
      icon: "⊕",
      color: "text-blue-400 bg-blue-400/10",
      subject: "You were added to API Redesign",
      preview: "Alex added you to this project",
      time: "9:14",
      unread: true,
    },
    {
      icon: "◈",
      color: "text-purple-400 bg-purple-400/10",
      subject: "Your role was changed",
      preview: "You are now Manager in Acme Workspace",
      time: "8:52",
      unread: false,
    },
    {
      icon: "↗",
      color: "text-green-400 bg-green-400/10",
      subject: "Task assigned to you",
      preview: "Fix login redirect · due Mar 14",
      time: "Yesterday",
      unread: false,
    },
    {
      icon: "✦",
      color: "text-amber-400 bg-amber-400/10",
      subject: "Workspace invite",
      preview: "Join Acme Corp workspace",
      time: "Mar 10",
      unread: false,
    },
  ];
  return (
    <div className="relative overflow-hidden border border-gray-200 bg-white font-mono text-xs dark:border-stroke-dark dark:bg-dark-secondary/80">
      <div className="scanline-bar pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-amber-400 to-transparent" />
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-stroke-dark dark:bg-dark-bg/80">
        <div className="flex h-5 w-5 items-center justify-center border border-amber-400">
          <div className="h-1.5 w-1.5 bg-amber-400" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-zinc-400">Inbox</span>
        <span className="ml-2 bg-amber-400/20 px-1.5 py-0.5 text-[9px] text-amber-400">2</span>
        <div className="ml-auto flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-dark-secondary" />
          <div className="h-2 w-2 rounded-full bg-gray-200 dark:bg-dark-secondary" />
          <div className="h-2 w-2 rounded-full bg-amber-400/60" />
        </div>
      </div>
      {/* email rows */}
      <div className="divide-y divide-gray-100 dark:divide-stroke-dark/40">
        {emails.map((e) => (
          <div
            key={e.subject}
            className={`flex items-start gap-3 px-4 py-3 ${e.unread ? "bg-amber-400/[0.03]" : ""}`}
          >
            <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center text-[11px] ${e.color}`}>
              {e.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-[11px] ${e.unread ? "font-semibold text-gray-900 dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}>
                  {e.subject}
                </span>
                <span className="flex-shrink-0 text-[9px] text-zinc-500">{e.time}</span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-zinc-600">{e.preview}</p>
            </div>
            {e.unread && <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LandingPage() {
  return (
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
        <LandingNavActions />
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
            complete visibility and AI that does the actual work.
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
              { n: "4", label: "Task views" },
              { n: "∞", label: "Workspaces" },
              { n: "AI", label: "Plan + Execute" },
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
                "List View", "Table View", "Timeline (Gantt)", "Team Members",
                "Role-Based Access", "Dark Mode", "Real-time Updates", "Invite Codes",
                "File Attachments", "Task Comments", "Email Digest", "AI Plan Generation",
                "AI Agent Executor", "Password Reset", "Email Verification",
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
              title: "4 Project Views",
              desc: "Kanban board, List, Timeline (Gantt chart), and Table (sortable DataGrid). Pick the view that matches how you think.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M1 4h14M1 8h14M1 12h14" strokeLinecap="square" />
                </svg>
              ),
            },
            {
              index: "03",
              title: "Role-Based Access",
              desc: "Three roles per workspace — Admin, Manager, Member. Enforced permissions on every action, from invites to project creation.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="8" cy="5" r="3" />
                  <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                  <path d="M11 9l1.5 1.5L15 8" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              index: "04",
              title: "Task Comments",
              desc: "Threaded 2-level comment system on every task. Inline edit, reply toggle, and permission-based delete keep discussions tidy.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M2 2h12v9H2z" />
                  <path d="M5 14l3-3h4" strokeLinecap="round" />
                  <path d="M5 6h6M5 8h4" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              index: "05",
              title: "File Attachments",
              desc: "Upload files directly to Cloudflare R2 via presigned URLs. Your API server stays stateless — no upload proxying.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M4 13H2V3h8l4 4v6h-2" />
                  <path d="M10 3v4h4" />
                  <path d="M8 9v5m-2-2l2 2 2-2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              index: "06",
              title: "Email Notifications",
              desc: "Transactional emails for invites, role changes, project assignments, and a daily task digest via cron — all powered by Resend.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="1" y="3" width="14" height="10" rx="1" />
                  <path d="M1 5l7 5 7-5" />
                </svg>
              ),
            },
            {
              index: "07",
              title: "Real-Time Updates",
              desc: "Task and project changes broadcast instantly via Socket.IO. No polling, no refresh — every team member sees the same state.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M1 8c0 3.9 3.1 7 7 7s7-3.1 7-7-3.1-7-7-7" strokeLinecap="round" />
                  <path d="M5 8c0 1.7 1.3 3 3 3s3-1.3 3-3-1.3-3-3-3" />
                  <circle cx="8" cy="8" r="1" fill="currentColor" />
                </svg>
              ),
            },
            {
              index: "08",
              title: "Dashboard Analytics",
              desc: "Project status charts and full task overview at a glance. Understand your team's throughput without opening a spreadsheet.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M1 13V7l3-3 3 3 3-5 3 3v8H1z" />
                </svg>
              ),
            },
            {
              index: "09",
              title: "Secure Auth",
              desc: "JWT in HTTP-only cookies (no localStorage), email verification, password reset flow, and per-request token refresh.",
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M8 1L2 4v4c0 3.5 2.7 6.7 6 7.5C11.3 14.7 14 11.5 14 8V4z" />
                  <path d="M5.5 8l2 2 3-3" strokeLinecap="round" />
                </svg>
              ),
            },
          ].map((f) => (
            <FeatureCard key={f.index} {...f} />
          ))}
        </div>
      </section>

      {/* ── AI FEATURES ─────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-gray-200 px-6 py-28 dark:border-stroke-dark md:px-12 lg:px-20">
        {/* bg accent — large dim square */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.025]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 1px, transparent 0, transparent 50%)", backgroundSize: "12px 12px" }}
        />

        <div className="mb-16">
          <SectionLabel>Intelligence layer</SectionLabel>
          <AmberLine />
          <h2 className="mt-6 text-4xl font-light leading-tight text-gray-900 dark:text-white md:text-5xl">
            AI that plans
            <br />
            <span className="text-amber-400">and executes.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-700 dark:text-zinc-300">
            Two new AI capabilities built directly into tasks — not a separate AI tool you have to switch to.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* AI Plan Generation */}
          <div className="group">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center border border-amber-400/40 text-amber-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 12h6M9 16h6M7 8h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Plan Generation</h3>
                  <span className="border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-amber-400">DeepSeek</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400">Two-pass LLM · GitHub-aware · Cached</p>
              </div>
            </div>
            <p className="mb-6 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
              Point a task at your GitHub repo. A two-pass DeepSeek pipeline reads the repo tree, selects only the relevant files, then generates a structured <code className="rounded bg-gray-100 px-1 py-0.5 text-sm dark:bg-dark-secondary dark:text-zinc-200">plan.md</code> with exact files to change, what to change, and why. The result is cached on the task so re-opening is instant. An in-memory rate limiter (10 req/hr) protects your API quota.
            </p>
            <div className="space-y-2.5 border-l-2 border-amber-400/30 pl-4">
              {["Reads your actual repo — not generic advice", "Two-pass: file selection then full plan", "Cached on task, re-generatable on demand"].map((pt) => (
                <div key={pt} className="flex items-start gap-2 text-base text-gray-700 dark:text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-amber-400" />
                  {pt}
                </div>
              ))}
            </div>
          </div>

          {/* AI Agent Executor */}
          <div className="group">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center border border-amber-400/40 text-amber-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Agent Executor</h3>
                  <span className="border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-green-400">New</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-zinc-400">Autonomous · PR-first · Human review</p>
              </div>
            </div>
            <p className="mb-6 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
              Click <strong className="text-gray-900 dark:text-white">Execute Plan</strong> and walk away. The agent reads the plan, fetches each file from GitHub, rewrites them individually via DeepSeek, commits to a feature branch, and opens a pull request. The backend responds immediately with <code className="rounded bg-gray-100 px-1 py-0.5 text-sm dark:bg-dark-secondary dark:text-zinc-200">202 Accepted</code> — completion arrives via Socket.IO. You review the PR; nothing merges without you.
            </p>
            <div className="space-y-2.5 border-l-2 border-amber-400/30 pl-4">
              {["202 non-blocking — no page spin while it runs", "Commits to agent/<name> branch, opens PR", "Socket.IO notifies you the moment it completes"].map((pt) => (
                <div key={pt} className="flex items-start gap-2 text-base text-gray-700 dark:text-zinc-300">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 bg-amber-400" />
                  {pt}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI plan + executor screen mock */}
        <div className="mt-16">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100 dark:bg-stroke-dark" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">plan.md → agent execution</span>
            <div className="h-px flex-1 bg-gray-100 dark:bg-stroke-dark" />
          </div>
          <div className="relative">
            <div className="absolute -left-3 -top-3 h-8 w-8 border-l-2 border-t-2 border-amber-400/50" />
            <div className="absolute -bottom-3 -right-3 h-8 w-8 border-b-2 border-r-2 border-amber-400/50" />
            <div className="absolute -inset-px bg-amber-400/5" />
            <div className="relative h-[460px] w-full">
              <AiPlanMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── EMAIL NOTIFICATIONS ──────────────────────────── */}
      <section className="border-t border-gray-200 px-6 py-28 dark:border-stroke-dark md:px-12 lg:px-20">
        <div className="mb-14">
          <SectionLabel>Notifications</SectionLabel>
          <AmberLine />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-4xl font-light leading-tight text-gray-900 dark:text-white md:text-5xl">
              Your team stays
              <br />
              <span className="text-gray-500 dark:text-zinc-500">in the loop.</span>
            </h2>
            <p className="max-w-xs text-base leading-relaxed text-gray-700 dark:text-zinc-300">
              Every meaningful event triggers an email. No configuration needed.
            </p>
          </div>
        </div>

        {/* Event cards grid + inbox side by side */}
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

          {/* Left — event type cards in a 2-col grid */}
          <div className="grid grid-cols-1 gap-px border border-gray-200 bg-gray-100 dark:border-stroke-dark dark:bg-stroke-dark sm:grid-cols-2">
            {[
              {
                icon: "✦",
                accent: "text-amber-400",
                bg: "bg-amber-400/8",
                trigger: "On register",
                label: "Account verification",
                desc: "Confirm your email before accessing the app.",
              },
              {
                icon: "↺",
                accent: "text-blue-400",
                bg: "bg-blue-400/8",
                trigger: "User-initiated",
                label: "Password reset",
                desc: "Time-bound token sent instantly on request.",
              },
              {
                icon: "↗",
                accent: "text-green-400",
                bg: "bg-green-400/8",
                trigger: "Admin · Manager",
                label: "Workspace invite",
                desc: "Invite link delivered the moment it's issued.",
              },
              {
                icon: "◈",
                accent: "text-purple-400",
                bg: "bg-purple-400/8",
                trigger: "Admin only",
                label: "Role changed",
                desc: "Member notified when their workspace role updates.",
              },
              {
                icon: "⊗",
                accent: "text-red-400",
                bg: "bg-red-400/8",
                trigger: "Admin · Manager",
                label: "Removed from workspace",
                desc: "Immediate notification on removal.",
              },
              {
                icon: "⊕",
                accent: "text-blue-400",
                bg: "bg-blue-400/8",
                trigger: "Project events",
                label: "Project assignment",
                desc: "Added to or removed from a project.",
              },
              {
                icon: "→",
                accent: "text-green-400",
                bg: "bg-green-400/8",
                trigger: "On create · reassign",
                label: "Task assigned",
                desc: "Know the moment a task lands in your queue.",
              },
              {
                icon: "⏱",
                accent: "text-amber-400",
                bg: "bg-amber-400/8",
                trigger: "00:00 UTC · cron",
                label: "Daily task digest",
                desc: "Overdue and due-soon tasks, delivered every morning.",
              },
            ].map(({ icon, accent, bg, trigger, label, desc }) => (
              <div key={label} className={`group relative bg-white p-6 transition-all duration-200 hover:${bg} dark:bg-dark-secondary/60 dark:hover:bg-dark-secondary`}>
                <div className="absolute -left-px -top-px h-3 w-3 border-l border-t border-amber-400/0 transition-all duration-300 group-hover:border-amber-400/50" />
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-base ${accent}`}>{icon}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-400">{trigger}</span>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-zinc-300">{desc}</p>
              </div>
            ))}
          </div>

          {/* Right — inbox mock, sticky */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-amber-400 pulse-amber" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">inbox preview</span>
            </div>
            <div className="relative">
              <div className="absolute -left-2 -top-2 h-6 w-6 border-l-2 border-t-2 border-amber-400/40" />
              <div className="absolute -bottom-2 -right-2 h-6 w-6 border-b-2 border-r-2 border-amber-400/40" />
              <NotifInboxMock />
            </div>
          </div>

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
              desc: "Break work into tasks, assign owners, set due dates, attach files, discuss in comments — and move from Todo → Done.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} className="group relative p-10 transition-colors hover:bg-gray-50/40 dark:hover:bg-dark-secondary/40">
              <div className="mb-6 font-mono text-6xl font-light text-zinc-800 transition-colors group-hover:text-amber-400/20">
                {n}
              </div>
              <AmberLine width="w-8" />
              <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-3 text-base leading-relaxed text-gray-700 dark:text-zinc-300">{desc}</p>
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
            {"Your team's work"}
            <br />
            deserves better
            <br />
            <span className="text-amber-400">tools.</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-gray-700 dark:text-zinc-300">
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
  );
}
