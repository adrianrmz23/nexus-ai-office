import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import {
  DEFAULT_VOICE_SETTINGS,
  type PendingPriority,
  type PendingRecord,
  type PendingStatus,
  type VoiceSettingsRecord,
} from "@/modules/pendings/domain/pending";

function dateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function zonedParts(now: Date, timeZone?: string): { year: number; month: number; day: number } {
  if (!timeZone) return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    return {
      year: Number(parts.find((part) => part.type === "year")?.value),
      month: Number(parts.find((part) => part.type === "month")?.value),
      day: Number(parts.find((part) => part.type === "day")?.value),
    };
  } catch {
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
}

function shiftedDateString(now: Date, days: number, timeZone?: string): string {
  const parts = zonedParts(now, timeZone);
  const value = new Date(parts.year, parts.month - 1, parts.day + days, 12);
  return dateOnly(value);
}

export function todayDateString(now = new Date(), timeZone?: string): string {
  const parts = zonedParts(now, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function tomorrowDateString(now = new Date(), timeZone?: string): string {
  return shiftedDateString(now, 1, timeZone);
}

export function weekEndDateString(now = new Date(), timeZone?: string): string {
  return shiftedDateString(now, 7, timeZone);
}

export function calculatePendingPriorityScore(
  pending: Pick<PendingRecord, "priority" | "status" | "due_date" | "snoozed_until" | "postponed_count">,
  now = new Date(),
  timeZone?: string,
): number {
  if (["completed", "cancelled", "archived"].includes(pending.status)) return 0;
  if (pending.snoozed_until && new Date(pending.snoozed_until) > now) return -100;

  const priorityBase: Record<PendingPriority, number> = {
    low: 10,
    medium: 30,
    high: 50,
    urgent: 70,
  };
  let score = priorityBase[pending.priority];
  const today = todayDateString(now, timeZone);
  const tomorrow = tomorrowDateString(now, timeZone);
  if (pending.due_date) {
    if (pending.due_date < today) score += 45;
    else if (pending.due_date === today) score += 32;
    else if (pending.due_date === tomorrow) score += 20;
    else if (pending.due_date <= weekEndDateString(now, timeZone)) score += 8;
  }
  if (pending.status === "in_progress") score += 12;
  if (pending.status === "waiting") score -= 8;
  score += Math.min(pending.postponed_count * 3, 18);
  return score;
}

type PendingFilters = {
  query?: string;
  status?: PendingStatus | "active" | "all";
  priority?: PendingPriority | "all";
  category?: string;
  due?: "today" | "overdue" | "week" | "none" | "all";
  timeZone?: string;
};

const pendingColumns = "id, workspace_id, owner_user_id, recurring_parent_id, source_conversation_id, title, description, notes, status, priority, category, tags, due_date, due_time, reminder_at, last_reminded_at, estimated_minutes, actual_minutes, recurrence_type, recurrence_interval, recurrence_end_date, snoozed_until, postponed_count, origin, completed_at, cancelled_at, archived_at, created_at, updated_at";

export async function loadPendingList(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  userId: string,
  filters: PendingFilters = {},
): Promise<PendingRecord[]> {
  let query = supabase
    .from("global_pendings")
    .select(pendingColumns)
    .eq("workspace_id", workspaceId)
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (!filters.status || filters.status === "active") {
    query = query.in("status", ["inbox", "pending", "in_progress", "waiting"]);
  } else if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") query = query.eq("priority", filters.priority);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.query?.trim()) query = query.ilike("title", `%${filters.query.trim()}%`);

  const today = todayDateString(new Date(), filters.timeZone);
  if (filters.due === "today") query = query.eq("due_date", today);
  if (filters.due === "overdue") query = query.lt("due_date", today);
  if (filters.due === "week") query = query.gte("due_date", today).lte("due_date", weekEndDateString(new Date(), filters.timeZone));
  if (filters.due === "none") query = query.is("due_date", null);

  const { data, error } = await query;
  if (error) throw new Error(`No pudimos cargar los pendientes: ${error.message}`);
  const rows = (data ?? []) as unknown as Omit<PendingRecord, "subtasks" | "priorityScore">[];
  if (!rows.length) return [];

  const { data: subtasks, error: subtaskError } = await supabase
    .from("pending_subtasks")
    .select("id, pending_id, title, position, is_completed, completed_at")
    .eq("workspace_id", workspaceId)
    .in("pending_id", rows.map((row) => row.id))
    .order("position");
  if (subtaskError) throw new Error(`No pudimos cargar los subpendientes: ${subtaskError.message}`);

  const byPending = new Map<string, PendingRecord["subtasks"]>();
  for (const item of subtasks ?? []) {
    const list = byPending.get(item.pending_id) ?? [];
    list.push({
      id: item.id,
      title: item.title,
      position: item.position,
      is_completed: item.is_completed,
      completed_at: item.completed_at,
    });
    byPending.set(item.pending_id, list);
  }

  return rows
    .map((row): PendingRecord => ({
      ...row,
      subtasks: byPending.get(row.id) ?? [],
      priorityScore: calculatePendingPriorityScore(row, new Date(), filters.timeZone),
    }))
    .sort((left, right) => right.priorityScore - left.priorityScore || left.title.localeCompare(right.title));
}

export async function loadPendingById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  userId: string,
  pendingId: string,
): Promise<PendingRecord | null> {
  const { data, error } = await supabase
    .from("global_pendings")
    .select(pendingColumns)
    .eq("workspace_id", workspaceId)
    .eq("owner_user_id", userId)
    .eq("id", pendingId)
    .maybeSingle();
  if (error) throw new Error(`No pudimos consultar el pendiente: ${error.message}`);
  if (!data) return null;

  const { data: subtasks, error: subtaskError } = await supabase
    .from("pending_subtasks")
    .select("id, title, position, is_completed, completed_at")
    .eq("workspace_id", workspaceId)
    .eq("pending_id", pendingId)
    .order("position");
  if (subtaskError) throw new Error(`No pudimos cargar los subpendientes: ${subtaskError.message}`);

  const row = data as unknown as Omit<PendingRecord, "subtasks" | "priorityScore">;
  return {
    ...row,
    subtasks: ((subtasks ?? []) as Array<{ id: string; title: string; position: number; is_completed: boolean; completed_at: string | null }>).map((item) => ({
      id: item.id,
      title: item.title,
      position: item.position,
      is_completed: item.is_completed,
      completed_at: item.completed_at,
    })),
    priorityScore: calculatePendingPriorityScore(row),
  };
}

export async function loadPendingCategories(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("global_pendings")
    .select("category")
    .eq("workspace_id", workspaceId)
    .eq("owner_user_id", userId)
    .order("category")
    .limit(500);
  const rows = (data ?? []) as Array<{ category: string | null }>;
  return [...new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value)))];
}

export async function loadVoiceSettings(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  userId: string,
): Promise<VoiceSettingsRecord> {
  const { data, error } = await supabase
    .from("voice_settings")
    .select("workspace_id, user_id, recognition_provider, synthesis_provider, language, time_zone, voice_name, speech_rate, speech_pitch, speech_volume, auto_read_briefing, auto_read_assistant, confirmations_spoken, save_transcripts, save_audio, browser_notifications, daily_briefing_enabled, daily_briefing_time")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`No pudimos cargar la configuración de voz: ${error.message}`);
  if (!data) return { workspace_id: workspaceId, user_id: userId, ...DEFAULT_VOICE_SETTINGS };
  return {
    ...(data as unknown as VoiceSettingsRecord),
    speech_rate: Number(data.speech_rate),
    speech_pitch: Number(data.speech_pitch),
    speech_volume: Number(data.speech_volume),
  };
}
