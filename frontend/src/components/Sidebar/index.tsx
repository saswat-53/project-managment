"use client";

import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setActiveWorkspaceId, setIsSidebarCollapsed } from "@/state";
import { useGetProjectsQuery, useGetWorkspacesQuery, useLogoutMutation } from "@/state/api";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Home,
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
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

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

  const sidebarClassNames = `fixed flex flex-col h-[100%] justify-between shadow-xl
    transition-all duration-300 h-full z-40 overflow-y-auto bg-white dark:bg-dark-bg
    ${isSidebarCollapsed ? "w-0 hidden" : "w-64"}
  `;

  return (
    <div className={sidebarClassNames}>
      <div className="flex h-[100%] w-full flex-col justify-start">
        {/* TOP LOGO */}
        <div className="z-50 flex min-h-[52px] w-64 items-center justify-between border-b border-gray-200 bg-white px-6 pt-3 dark:border-stroke-dark dark:bg-dark-bg">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-amber-400">
              <div className="h-2.5 w-2.5 bg-amber-400" />
            </div>
            <span className="text-base font-bold uppercase tracking-widest text-gray-900 dark:text-white">
              ProjectFlow
            </span>
          </div>
          {isSidebarCollapsed ? null : (
            <button
              className="py-3"
              onClick={() =>
                dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))
              }
            >
              <X className="h-6 w-6 text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white" />
            </button>
          )}
        </div>

        {/* ACTIVE WORKSPACE */}
        <div className="flex items-center justify-between px-8 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-zinc-500">
              Workspace
            </p>
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-zinc-200">
              {activeWorkspace?.name ?? (activeWorkspaceId ? "Loading..." : "None selected")}
            </p>
          </div>
          <Link
            href="/workspaces"
            className="ml-2 shrink-0 border border-gray-300 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-500 dark:border-stroke-dark dark:text-zinc-400 dark:hover:border-amber-400/50 dark:hover:text-amber-400"
          >
            Switch
          </Link>
        </div>

        {/* NAVBAR LINKS */}
        <nav className="z-10 w-full">
          <SidebarLink icon={Home} label="Home" href="/dashboard" />
          <SidebarLink icon={Settings} label="Settings" href="/settings" />
          <SidebarLink icon={User} label="Members" href="/users" />
        </nav>

        {/* PROJECTS LINKS */}
        <button
          onClick={() => setShowProjects((prev) => !prev)}
          className="flex w-full items-center justify-between px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-gray-400 transition-colors hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          <span>Projects</span>
          {showProjects ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {showProjects &&
          projects?.map((project) => (
            <SidebarLink
              key={project._id}
              icon={Briefcase}
              label={project.name}
              href={`/projects/${project._id}`}
            />
          ))}
      </div>

      {/* BOTTOM — user sign out (mobile) */}
      <div className="z-10 mt-32 flex w-full flex-col items-center gap-4 border-t border-gray-200 bg-white px-8 py-4 dark:border-stroke-dark dark:bg-dark-bg md:hidden">
        <div className="flex w-full items-center">
          <User className="h-6 w-6 cursor-pointer self-center rounded-full text-gray-400 dark:text-zinc-400" />
          <button
            className="ml-auto border border-amber-400 px-4 py-2 text-xs uppercase tracking-[0.15em] text-amber-600 transition-all hover:bg-amber-400 hover:text-zinc-950 dark:text-amber-400 dark:hover:text-zinc-950"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
}

const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");

  return (
    <Link href={href} className="w-full">
      <div
        className={`relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-dark-secondary/60 ${
          isActive ? "bg-gray-100 dark:bg-dark-secondary" : ""
        } justify-start px-8 py-3`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 h-full w-[3px] bg-amber-400" />
        )}
        <Icon
          className={`h-5 w-5 ${isActive ? "text-amber-500 dark:text-amber-400" : "text-gray-500 dark:text-zinc-400"}`}
        />
        <span
          className={`text-sm font-medium ${isActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};

export default Sidebar;
