"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { loadBrowserVoiceSettings, speakText } from "@/components/voice/voice-runtime";

type Reminder = { id: string; title: string; dueLabel: string };

export function PendingReminderWatcher() {
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/pendings/reminders", { cache: "no-store" });
        if (!response.ok || !active) return;
        const payload = (await response.json()) as { reminders: Reminder[] };
        const settings = loadBrowserVoiceSettings();
        for (const reminder of payload.reminders) {
          toast.info(reminder.title, { description: reminder.dueLabel, duration: 10_000 });
          if (settings.browser_notifications && "Notification" in window && Notification.permission === "granted") {
            new Notification(`NEXUS · ${reminder.title}`, { body: reminder.dueLabel, tag: reminder.id });
          }
          if (settings.confirmations_spoken) speakText(`Recordatorio. ${reminder.title}. ${reminder.dueLabel}.`, settings);
        }
      } catch {
        // Los recordatorios no deben interrumpir la oficina si la red falla.
      }
    };
    void check();
    const timer = window.setInterval(check, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
