export const PENDING_STATUSES = [
  "inbox",
  "pending",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
  "archived",
] as const;
export type PendingStatus = (typeof PENDING_STATUSES)[number];

export const PENDING_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type PendingPriority = (typeof PENDING_PRIORITIES)[number];

export const PENDING_RECURRENCES = ["none", "daily", "weekly", "monthly", "weekdays"] as const;
export type PendingRecurrence = (typeof PENDING_RECURRENCES)[number];

export const PENDING_ORIGINS = ["manual", "voice", "briefing", "conversation", "recurrence"] as const;
export type PendingOrigin = (typeof PENDING_ORIGINS)[number];

export const PENDING_STATUS_LABELS: Record<PendingStatus, string> = {
  inbox: "Bandeja",
  pending: "Pendiente",
  in_progress: "En progreso",
  waiting: "En espera",
  completed: "Completado",
  cancelled: "Cancelado",
  archived: "Archivado",
};

export const PENDING_PRIORITY_LABELS: Record<PendingPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const PENDING_RECURRENCE_LABELS: Record<PendingRecurrence, string> = {
  none: "No se repite",
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensualmente",
  weekdays: "Días laborables",
};

export type PendingSubtask = {
  id: string;
  title: string;
  position: number;
  is_completed: boolean;
  completed_at: string | null;
};

export type PendingRecord = {
  id: string;
  workspace_id: string;
  owner_user_id: string;
  recurring_parent_id: string | null;
  source_conversation_id: string | null;
  title: string;
  description: string;
  notes: string;
  status: PendingStatus;
  priority: PendingPriority;
  category: string;
  tags: string[];
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  last_reminded_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  recurrence_type: PendingRecurrence;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  snoozed_until: string | null;
  postponed_count: number;
  origin: PendingOrigin;
  completed_at: string | null;
  cancelled_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks: PendingSubtask[];
  priorityScore: number;
};

export type VoiceSettingsRecord = {
  workspace_id: string;
  user_id: string;
  recognition_provider: "browser" | "disabled";
  synthesis_provider: "browser" | "disabled";
  language: string;
  time_zone: string;
  voice_name: string | null;
  speech_rate: number;
  speech_pitch: number;
  speech_volume: number;
  auto_read_briefing: boolean;
  auto_read_assistant: boolean;
  confirmations_spoken: boolean;
  save_transcripts: boolean;
  save_audio: boolean;
  browser_notifications: boolean;
  daily_briefing_enabled: boolean;
  daily_briefing_time: string;
};

export const DEFAULT_VOICE_SETTINGS: Omit<VoiceSettingsRecord, "workspace_id" | "user_id"> = {
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
  save_transcripts: true,
  save_audio: false,
  browser_notifications: false,
  daily_briefing_enabled: true,
  daily_briefing_time: "08:00:00",
};
