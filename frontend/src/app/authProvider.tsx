"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetCurrentUserQuery } from "@/state/api";
import { useAppSelector } from "./redux";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );
  const { data: currentUser, isLoading, isError } = useGetCurrentUserQuery();

  useEffect(() => {
    if (isLoading) return;

    if (isError || !currentUser) {
      router.push("/login");
      return;
    }

    if (!activeWorkspaceId) {
      router.push("/workspaces");
    }
  }, [isLoading, isError, currentUser, activeWorkspaceId, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !currentUser || !activeWorkspaceId) return null;

  return <>{children}</>;
};

export default AuthProvider;
