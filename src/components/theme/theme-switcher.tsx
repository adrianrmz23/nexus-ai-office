"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";

const options: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, mounted } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center rounded-xl border border-border bg-card/80 p-1 shadow-sm",
        compact ? "gap-0" : "gap-1",
      )}
      aria-label="Seleccionar apariencia"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size={compact ? "icon-sm" : "sm"}
            className={cn(
              "rounded-lg text-muted-foreground hover:text-foreground",
              active && "bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary",
            )}
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            title={`Tema ${option.label.toLowerCase()}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {compact ? <span className="sr-only">{option.label}</span> : option.label}
          </Button>
        );
      })}
    </div>
  );
}
