"use client";

import React from "react";
import { Menu, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector, getPersistor } from "@/app/redux";
import { setActiveWorkspaceId, setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { api, useGetCurrentUserQuery, useLogoutMutation } from "@/state/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
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
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2">
        {isSidebarCollapsed && (
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(false))}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={isDarkMode ? "Light mode" : "Dark mode"}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>

        <Separator orientation="vertical" className="mx-2 h-5" />

        <div className="hidden items-center gap-3 md:flex">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-muted flex items-center justify-center">
            {currentUser?.avatarUrl ? (
              <Image
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className={cn("text-sm font-semibold text-muted-foreground uppercase")}>
                {currentUser?.name?.[0] ?? "U"}
              </span>
            )}
          </div>

          <span className="text-base font-medium text-foreground">
            {currentUser?.name}
          </span>

          <Button variant="outline" size="default" onClick={handleSignOut} className="h-9 px-4 text-sm">
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
