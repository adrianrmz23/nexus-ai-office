"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme, type ThemePreference } from "@/components/theme/theme-provider";

const themes: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    title: "Claro",
    description: "Fondos claros, paneles blancos y contraste cómodo para trabajar con luz ambiental.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Oscuro",
    description: "La identidad original de NEXUS, optimizada para sesiones nocturnas.",
    icon: Moon,
  },
  {
    value: "system",
    title: "Usar el sistema",
    description: "NEXUS seguirá automáticamente la apariencia de Windows o del dispositivo.",
    icon: Monitor,
  },
];

export function ThemeSettings() {
  const { theme, setTheme, mounted } = useTheme();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {themes.map((item) => {
        const Icon = item.icon;
        const selected = mounted && theme === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setTheme(item.value)}
            className={cn(
              "nexus-focus relative rounded-2xl border bg-card p-5 text-left shadow-sm transition",
              selected
                ? "border-primary/45 ring-2 ring-primary/15"
                : "border-border hover:border-primary/25 hover:bg-muted/35",
            )}
            aria-pressed={selected}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              {selected ? (
                <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <h3 className="mt-5 text-base font-semibold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}
