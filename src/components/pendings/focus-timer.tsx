"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FocusTimer({ pendingId, estimatedMinutes }: { pendingId: string; estimatedMinutes: number | null }) {
  const initialSeconds = Math.max(1, Math.min(180, estimatedMinutes ?? 25)) * 60;
  const storageKey = useMemo(() => `nexus-focus-${pendingId}`, [pendingId]);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        setHydrated(true);
        return;
      }

      try {
        const parsed = JSON.parse(saved) as { seconds?: number; running?: boolean; savedAt?: number };
        const elapsed = parsed.running && parsed.savedAt ? Math.floor((Date.now() - parsed.savedAt) / 1000) : 0;
        const restoredSeconds = Math.max(0, Number(parsed.seconds ?? initialSeconds) - elapsed);

        setSeconds(restoredSeconds);
        setRunning(Boolean(parsed.running) && restoredSeconds > 0);
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [initialSeconds, storageKey]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("NEXUS · Sesión de enfoque terminada", { body: "Es momento de revisar el avance del pendiente." });
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ seconds, running, savedAt: Date.now() }));
  }, [hydrated, running, seconds, storageKey]);

  const reset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="nexus-panel mt-4 rounded-2xl p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><TimerReset className="size-4 text-primary" />Sesión de enfoque local</div>
      <div className="mt-4 font-mono text-5xl font-semibold tracking-[-0.08em] text-foreground">{formatSeconds(seconds)}</div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">El temporizador permanece en este navegador. No modifica el tiempo real del pendiente hasta que tú lo registres.</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button type="button" onClick={() => setRunning((value) => !value)} disabled={seconds === 0}>
          {running ? <Pause /> : <Play />}{running ? "Pausar" : "Iniciar"}
        </Button>
        <Button type="button" variant="outline" onClick={reset}><RotateCcw />Reiniciar</Button>
      </div>
    </div>
  );
}
