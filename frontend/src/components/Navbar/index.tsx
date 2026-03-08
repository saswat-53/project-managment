"use client";

import React from "react";
import { Menu, Moon, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, getPersistor } from "@/app/redux";
import { setActiveWorkspaceId, setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { api, useGetCurrentUserQuery, useLogoutMutation } from "@/state/api";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const { data: currentUser } = useGetCurrentUserQuery();
  const [logout] = useLogoutMutation();

  const handleSignOut = async () => {
    try {
      await logout().unwrap();
    } catch {}
    dispatch(setActiveWorkspaceId(null));
    dispatch(api.util.resetApiState());
    await getPersistor().purge();
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Left — sidebar toggle */}
      <div className="flex items-center gap-8">
        {!isSidebarCollapsed ? null : (
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
          >
            <Menu className="h-7 w-7 text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-white" />
          </button>
        )}
      </div>

      {/* Right — icons + user */}
      <div className="flex items-center">
        <button
          onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
          className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          {isDarkMode ? (
            <Sun className="h-5 w-5 cursor-pointer" />
          ) : (
            <Moon className="h-5 w-5 cursor-pointer" />
          )}
        </button>
        <Link
          href="/settings"
          className="h-min w-min rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <Settings className="h-5 w-5 cursor-pointer" />
        </Link>
        <div className="ml-2 mr-5 hidden min-h-[2em] w-px bg-gray-200 dark:bg-zinc-800 md:inline-block" />
        <div className="hidden items-center justify-between md:flex">
          <div className="align-center flex h-8 w-8 justify-center">
            {currentUser?.avatarUrl ? (
              <Image
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                width={32}
                height={32}
                className="h-full w-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <User className="h-5 w-5 cursor-pointer self-center rounded-full text-gray-500 dark:text-zinc-400" />
            )}
          </div>
          <span className="mx-3 text-sm text-gray-700 dark:text-zinc-300">
            {currentUser?.name}
          </span>
          <button
            className="hidden border border-amber-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-600 transition-all hover:bg-amber-400 hover:text-zinc-950 dark:text-amber-400 dark:hover:text-zinc-950 md:block"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
