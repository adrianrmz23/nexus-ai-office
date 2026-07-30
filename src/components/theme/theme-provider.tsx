"use client";

import { useSyncExternalStore, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "nexus-theme";
const listeners = new Set<() => void>();

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.dataset.themePreference = theme;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;

  return resolved;
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    if (getThemeSnapshot() === "system") {
      applyTheme("system");
      emitChange();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const nextTheme = isThemePreference(event.newValue) ? event.newValue : "system";
    applyTheme(nextTheme);
    emitChange();
  };

  media.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", handleMediaChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getThemeSnapshot(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(stored)) return stored;

  const attribute = document.documentElement.dataset.themePreference ?? null;
  return isThemePreference(attribute) ? attribute : "system";
}

function getResolvedThemeSnapshot(): ResolvedTheme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): ThemePreference {
  return "system";
}

function getServerResolvedThemeSnapshot(): ResolvedTheme {
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolvedThemeSnapshot,
    getServerResolvedThemeSnapshot,
  );

  const setTheme = (nextTheme: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    emitChange();

    document.documentElement.classList.add("nexus-theme-transition");
    window.setTimeout(() => {
      document.documentElement.classList.remove("nexus-theme-transition");
    }, 220);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    mounted: true,
  };
}
