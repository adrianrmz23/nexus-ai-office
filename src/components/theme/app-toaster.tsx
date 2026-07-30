"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/components/theme/theme-provider";

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
        },
      }}
    />
  );
}
