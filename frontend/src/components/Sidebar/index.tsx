"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setActiveWorkspaceId, setIsSidebarCollapsed } from "@/state";
import { useGetProjectsQuery, useGetWorkspacesQuery, useLogoutMutation } from "@/state/api";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Home,
  LogOut,
  Settings,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

const Sidebar = () => {
  const [showProjects, setShowProjects] = useState(true);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);

  const { data: workspaces } = useGetWorkspacesQuery();
  const activeWorkspace = workspaces?.find((w) => w._id === activeWorkspaceId);

  const { data: projects } = useGetProjectsQuery(activeWorkspaceId ?? "", {
    skip: !activeWorkspaceId,
  });

  const [logout] = useLogoutMutation();

  const handleSignOut = async () => {
    try {
      await logout().unwrap();
    } catch {}
    dispatch(setActiveWorkspaceId(null));
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed flex h-full flex-col border-r border-border bg-card text-card-foreground shadow-sm transition-all duration-300 z-40 overflow-y-auto",
        isSidebarCollapsed ? "w-0 hidden" : "w-64",
      )}
    >
      {/* HEADER */}
      <div className="flex h-14 items-center justify-between px-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center border-2 border-amber-400">
            <div className="h-2.5 w-2.5 bg-amber-400" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            ProjectFlow
          </span>
        </div>
        <button
          onClick={() => dispatch(setIsSidebarCollapsed(true))}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* WORKSPACE */}
      <div className="px-4 py-3">
        <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
            <p className="truncate text-sm font-semibold text-foreground leading-tight mt-0.5">
              {activeWorkspace?.name ?? (activeWorkspaceId ? "Loading…" : "None")}
            </p>
          </div>
          <Link
            href="/workspaces"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-amber-400 hover:text-amber-500 transition-colors"
          >
            Switch
          </Link>
        </div>
      </div>

      <Separator />

      {/* NAV LINKS */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </p>
        <SidebarLink icon={Home} label="Home" href="/dashboard" />
        <SidebarLink icon={Settings} label="Settings" href="/settings" />
        <SidebarLink icon={User} label="Members" href="/users" />

        <div className="pt-3">
          <button
            onClick={() => setShowProjects((p) => !p)}
            className="flex w-full items-center justify-between rounded-md px-3 py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Projects</span>
            {showProjects ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showProjects && (
            <div className="mt-1 space-y-0.5">
              {projects?.map((project) => (
                <SidebarLink
                  key={project._id}
                  icon={Briefcase}
                  label={project.name}
                  href={`/projects/${project._id}`}
                />
              ))}
              {projects?.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground italic">No projects yet</p>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* FOOTER — mobile sign out */}
      <div className="border-t border-border px-4 py-3 md:hidden">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href} className="block" title={label}>
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-base transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-amber-400" />
        )}
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-amber-500" : "")} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
};

export default Sidebar;
