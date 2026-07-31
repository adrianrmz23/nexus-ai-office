"use client";

import { useEffect } from "react";

import { saveBrowserVoiceSettings } from "@/components/voice/voice-runtime";
import type { VoiceSettingsRecord } from "@/modules/pendings/domain/pending";

export function VoiceSettingsBootstrap({ settings }: { settings: VoiceSettingsRecord }) {
  useEffect(() => {
    saveBrowserVoiceSettings({
      recognition_provider: settings.recognition_provider,
      synthesis_provider: settings.synthesis_provider,
      language: settings.language,
      time_zone: settings.time_zone,
      voice_name: settings.voice_name,
      speech_rate: Number(settings.speech_rate),
      speech_pitch: Number(settings.speech_pitch),
      speech_volume: Number(settings.speech_volume),
      auto_read_briefing: settings.auto_read_briefing,
      auto_read_assistant: settings.auto_read_assistant,
      confirmations_spoken: settings.confirmations_spoken,
      browser_notifications: settings.browser_notifications,
      daily_briefing_enabled: settings.daily_briefing_enabled,
      daily_briefing_time: settings.daily_briefing_time,
    });
  }, [settings]);
  return null;
}
