"use client";

import { useEffect } from "react";
import { Headphones } from "lucide-react";

import { VoiceReader } from "@/components/voice/voice-reader";
import { loadBrowserVoiceSettings, speakText } from "@/components/voice/voice-runtime";

function dateKey(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function millisecondsUntil(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return Math.max(0, target.getTime() - now.getTime());
}

export function DailyBriefing({ text }: { text: string }) {
  useEffect(() => {
    const settings = loadBrowserVoiceSettings();
    if (!settings.daily_briefing_enabled || !settings.auto_read_briefing) return;
    const today = dateKey(settings.time_zone);
    const key = `nexus-briefing-read-${today}`;
    if (window.localStorage.getItem(key) === "1") return;

    const play = () => {
      if (window.localStorage.getItem(key) === "1") return;
      speakText(text, settings);
      window.localStorage.setItem(key, "1");
    };
    const delay = millisecondsUntil(settings.daily_briefing_time);
    if (delay === 0) {
      play();
      return;
    }
    const timer = window.setTimeout(play, Math.min(delay, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
      <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Headphones className="size-4" /></div>
      <div className="min-w-0 flex-1"><div className="text-sm font-medium text-foreground">Briefing diario</div><p className="mt-1 text-xs text-muted-foreground">Escucha las prioridades, vencimientos y revisiones que requieren tu atención.</p></div>
      <VoiceReader text={text} label="Escuchar briefing" />
    </div>
  );
}
