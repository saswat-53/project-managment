"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGetCurrentUserQuery } from "@/state/api";
import { useAppSelector } from "./redux";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );
  const { data: currentUser, isLoading, isError } = useGetCurrentUserQuery();

  // Settings is allowed even with an unverified email so users can correct a
  // wrong address they just saved.
  const isSettingsPage = pathname === "/settings";

  useEffect(() => {
    if (isLoading) return;

    if (isError || !currentUser) {
      router.push("/login");
      return;
    }

    if (!currentUser.isEmailVerified && !isSettingsPage) {
      router.push("/verify-email");
      return;
    }

    if (!activeWorkspaceId && !isSettingsPage) {
      router.push("/workspaces");
    }
  }, [isLoading, isError, currentUser, activeWorkspaceId, router, isSettingsPage]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !currentUser || (!currentUser.isEmailVerified && !isSettingsPage) || (!activeWorkspaceId && !isSettingsPage)) return null;

  return <>{children}</>;
};

export default AuthProvider;
