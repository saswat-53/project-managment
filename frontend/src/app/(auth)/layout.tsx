"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/app/redux";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return <>{children}</>;
}
