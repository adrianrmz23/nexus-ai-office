import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "nexus-focus min-h-28 w-full resize-y rounded-lg border border-input bg-white/[0.025] px-3.5 py-3 text-sm leading-6 text-foreground shadow-inner shadow-black/10 transition-colors placeholder:text-muted-foreground/70 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
