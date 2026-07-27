import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "nexus-focus h-11 w-full rounded-lg border border-input bg-white/[0.025] px-3.5 text-sm text-foreground shadow-inner shadow-black/10 transition-colors placeholder:text-muted-foreground/70 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
