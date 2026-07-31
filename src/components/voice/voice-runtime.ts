import type { VoiceSettingsRecord } from "@/modules/pendings/domain/pending";

export type BrowserVoiceSettings = Pick<
  VoiceSettingsRecord,
  | "recognition_provider"
  | "synthesis_provider"
  | "language"
  | "time_zone"
  | "voice_name"
  | "speech_rate"
  | "speech_pitch"
  | "speech_volume"
  | "auto_read_briefing"
  | "auto_read_assistant"
  | "confirmations_spoken"
  | "browser_notifications"
  | "daily_briefing_enabled"
  | "daily_briefing_time"
>;

const STORAGE_KEY = "nexus-voice-settings";

export const DEFAULT_BROWSER_VOICE_SETTINGS: BrowserVoiceSettings = {
  recognition_provider: "browser",
  synthesis_provider: "browser",
  language: "es-MX",
  time_zone: "America/Mexico_City",
  voice_name: null,
  speech_rate: 1,
  speech_pitch: 1,
  speech_volume: 1,
  auto_read_briefing: false,
  auto_read_assistant: false,
  confirmations_spoken: true,
  browser_notifications: false,
  daily_briefing_enabled: true,
  daily_briefing_time: "08:00:00",
};

export function saveBrowserVoiceSettings(settings: BrowserVoiceSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function loadBrowserVoiceSettings(): BrowserVoiceSettings {
  if (typeof window === "undefined") return DEFAULT_BROWSER_VOICE_SETTINGS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_BROWSER_VOICE_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<BrowserVoiceSettings>;
    return { ...DEFAULT_BROWSER_VOICE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_BROWSER_VOICE_SETTINGS;
  }
}

export function stripForSpeech(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " bloque de código ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speakText(text: string, overrides: Partial<BrowserVoiceSettings> = {}): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const settings = { ...loadBrowserVoiceSettings(), ...overrides };
  if (settings.synthesis_provider === "disabled") return null;
  const content = stripForSpeech(text);
  if (!content) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = settings.language;
  utterance.rate = settings.speech_rate;
  utterance.pitch = settings.speech_pitch;
  utterance.volume = settings.speech_volume;
  const voices = window.speechSynthesis.getVoices();
  const selected = settings.voice_name
    ? voices.find((voice) => voice.name === settings.voice_name)
    : voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.language.slice(0, 2).toLowerCase()));
  if (selected) utterance.voice = selected;
  window.speechSynthesis.speak(utterance);
  return utterance;
}
