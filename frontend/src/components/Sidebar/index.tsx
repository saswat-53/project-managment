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
    transition-all duration-300 h-full z-40 dark:bg-black overflow-y-auto bg-white
    ${isSidebarCollapsed ? "w-0 hidden" : "w-64"}
  `;

  return (
    <div className={sidebarClassNames}>
      <div className="flex h-[100%] w-full flex-col justify-start">
        {/* TOP LOGO */}
        <div className="z-50 flex min-h-[56px] w-64 items-center justify-between bg-white px-6 pt-3 dark:bg-black">
          <div className="text-xl font-bold text-gray-800 dark:text-white">
            ProjectFlow
          </div>
          {isSidebarCollapsed ? null : (
            <button
              className="py-3"
              onClick={() =>
                dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))
              }
            >
              <X className="h-6 w-6 text-gray-800 hover:text-gray-500 dark:text-white" />
            </button>
          )}
        </div>

        {/* ACTIVE WORKSPACE */}
        <div className="flex items-center justify-between border-y-[1.5px] border-gray-200 px-8 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Workspace
            </p>
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
              {activeWorkspace?.name ?? (activeWorkspaceId ? "Loading..." : "None selected")}
            </p>
          </div>
          <Link
            href="/workspaces"
            className="ml-2 shrink-0 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
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
          className="flex w-full items-center justify-between px-8 py-3 text-gray-500"
        >
          <span>Projects</span>
          {showProjects ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
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
      <div className="z-10 mt-32 flex w-full flex-col items-center gap-4 bg-white px-8 py-4 dark:bg-black md:hidden">
        <div className="flex w-full items-center">
          <User className="h-6 w-6 cursor-pointer self-center rounded-full dark:text-white" />
          <button
            className="ml-auto rounded bg-blue-400 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
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
        className={`relative flex cursor-pointer items-center gap-3 transition-colors hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-700 ${
          isActive ? "bg-gray-100 text-white dark:bg-gray-600" : ""
        } justify-start px-8 py-3`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 h-[100%] w-[5px] bg-blue-200" />
        )}
        <Icon className="h-6 w-6 text-gray-800 dark:text-gray-100" />
        <span className="font-medium text-gray-800 dark:text-gray-100">
          {label}
        </span>
      </div>
    </Link>
  );
};

export default Sidebar;
