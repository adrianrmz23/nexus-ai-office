"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { pendingFormSchema, pendingIdSchema, pendingStatusSchema, voiceSettingsSchema } from "@/modules/pendings/domain/pending-schema";
import { loadPendingById } from "@/modules/pendings/application/pending-queries";
import type { PendingRecord } from "@/modules/pendings/domain/pending";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function redirectMessage(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos del pendiente.";
}

function normalizeLocalDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function parseList(value: string): string[] {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function parsePendingForm(formData: FormData) {
  return pendingFormSchema.safeParse({
    title: textValue(formData, "title"),
    description: textValue(formData, "description"),
    notes: textValue(formData, "notes"),
    status: textValue(formData, "status"),
    priority: textValue(formData, "priority"),
    category: textValue(formData, "category") || "General",
    tags: parseList(textValue(formData, "tags")),
    dueDate: textValue(formData, "dueDate"),
    dueTime: textValue(formData, "dueTime"),
    reminderAt: normalizeLocalDateTime(textValue(formData, "reminderAt")),
    estimatedMinutes: textValue(formData, "estimatedMinutes"),
    actualMinutes: textValue(formData, "actualMinutes"),
    recurrenceType: textValue(formData, "recurrenceType") || "none",
    recurrenceInterval: textValue(formData, "recurrenceInterval") || "1",
    recurrenceEndDate: textValue(formData, "recurrenceEndDate"),
    sourceConversationId: textValue(formData, "sourceConversationId"),
    origin: textValue(formData, "origin") || "manual",
    subtasks: parseList(textValue(formData, "subtasks")),
  });
}

function revalidatePendingPaths(pendingId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/hoy");
  revalidatePath("/app/pendientes");
  if (pendingId) {
    revalidatePath(`/app/pendientes/${pendingId}`);
    revalidatePath(`/app/pendientes/${pendingId}/editar`);
  }
}

export async function createPending(formData: FormData) {
  const result = parsePendingForm(formData);
  if (!result.success) redirectMessage("/app/pendientes/nuevo", "error", firstIssue(result.error));
  const { supabase, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("create_global_pending_record", {
    p_workspace_id: membership.workspaceId,
    p_title: result.data.title,
    p_description: result.data.description,
    p_notes: result.data.notes,
    p_status: result.data.status,
    p_priority: result.data.priority,
    p_category: result.data.category,
    p_tags: result.data.tags,
    p_due_date: result.data.dueDate,
    p_due_time: result.data.dueTime,
    p_reminder_at: result.data.reminderAt,
    p_estimated_minutes: result.data.estimatedMinutes,
    p_recurrence_type: result.data.recurrenceType,
    p_recurrence_interval: result.data.recurrenceInterval,
    p_recurrence_end_date: result.data.recurrenceEndDate,
    p_origin: result.data.origin,
    p_source_conversation_id: result.data.sourceConversationId,
    p_recurring_parent_id: null,
    p_subtasks: result.data.subtasks,
  });
  if (error || typeof data !== "string") {
    redirectMessage("/app/pendientes/nuevo", "error", error?.message ?? "No pudimos crear el pendiente.");
  }
  revalidatePendingPaths(data);
  redirectMessage(`/app/pendientes/${data}`, "success", "El pendiente fue creado.");
}

export async function updatePending(formData: FormData) {
  const idResult = pendingIdSchema.safeParse(textValue(formData, "pendingId"));
  const result = parsePendingForm(formData);
  const fallback = idResult.success ? `/app/pendientes/${idResult.data}/editar` : "/app/pendientes";
  if (!idResult.success) redirectMessage("/app/pendientes", "error", "El pendiente seleccionado no es válido.");
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("update_global_pending_record", {
    p_pending_id: idResult.data,
    p_title: result.data.title,
    p_description: result.data.description,
    p_notes: result.data.notes,
    p_status: result.data.status,
    p_priority: result.data.priority,
    p_category: result.data.category,
    p_tags: result.data.tags,
    p_due_date: result.data.dueDate,
    p_due_time: result.data.dueTime,
    p_reminder_at: result.data.reminderAt,
    p_estimated_minutes: result.data.estimatedMinutes,
    p_actual_minutes: result.data.actualMinutes,
    p_recurrence_type: result.data.recurrenceType,
    p_recurrence_interval: result.data.recurrenceInterval,
    p_recurrence_end_date: result.data.recurrenceEndDate,
    p_subtasks: result.data.subtasks,
  });
  if (error || typeof data !== "string") redirectMessage(fallback, "error", error?.message ?? "No pudimos actualizar el pendiente.");
  revalidatePendingPaths(data);
  redirectMessage(`/app/pendientes/${data}`, "success", "El pendiente fue actualizado.");
}

function nextRecurringDate(pending: PendingRecord): string | null {
  if (!pending.due_date || pending.recurrence_type === "none") return null;
  const [year, month, day] = pending.due_date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const interval = Math.max(1, pending.recurrence_interval);
  if (pending.recurrence_type === "daily") date.setDate(date.getDate() + interval);
  if (pending.recurrence_type === "weekly") date.setDate(date.getDate() + 7 * interval);
  if (pending.recurrence_type === "monthly") date.setMonth(date.getMonth() + interval);
  if (pending.recurrence_type === "weekdays") {
    let remaining = interval;
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      if (![0, 6].includes(date.getDay())) remaining -= 1;
    }
  }
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (pending.recurrence_end_date && next > pending.recurrence_end_date) return null;
  return next;
}

async function createNextRecurrence(pending: PendingRecord) {
  const nextDate = nextRecurringDate(pending);
  if (!nextDate) return;
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const recurrenceRootId = pending.recurring_parent_id ?? pending.id;
  const { count } = await supabase
    .from("global_pendings")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspaceId)
    .eq("owner_user_id", user.id)
    .eq("recurring_parent_id", recurrenceRootId)
    .eq("due_date", nextDate)
    .neq("status", "archived");
  if ((count ?? 0) > 0) return;
  await supabase.rpc("create_global_pending_record", {
    p_workspace_id: membership.workspaceId,
    p_title: pending.title,
    p_description: pending.description,
    p_notes: pending.notes,
    p_status: "pending",
    p_priority: pending.priority,
    p_category: pending.category,
    p_tags: pending.tags,
    p_due_date: nextDate,
    p_due_time: pending.due_time?.slice(0, 5) ?? null,
    p_reminder_at: null,
    p_estimated_minutes: pending.estimated_minutes,
    p_recurrence_type: pending.recurrence_type,
    p_recurrence_interval: pending.recurrence_interval,
    p_recurrence_end_date: pending.recurrence_end_date,
    p_origin: "recurrence",
    p_source_conversation_id: null,
    p_recurring_parent_id: recurrenceRootId,
    p_subtasks: pending.subtasks.map((item) => item.title),
  });
}

export async function setPendingStatus(formData: FormData) {
  const idResult = pendingIdSchema.safeParse(textValue(formData, "pendingId"));
  const statusResult = pendingStatusSchema.safeParse(textValue(formData, "status"));
  if (!idResult.success || !statusResult.success) redirectMessage("/app/pendientes", "error", "La operación no es válida.");
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const pending = await loadPendingById(supabase, membership.workspaceId, user.id, idResult.data);
  if (!pending) redirectMessage("/app/pendientes", "error", "No encontramos el pendiente.");
  const { error } = await supabase
    .from("global_pendings")
    .update({ status: statusResult.data, updated_by: user.id })
    .eq("workspace_id", membership.workspaceId)
    .eq("owner_user_id", user.id)
    .eq("id", idResult.data);
  if (error) redirectMessage(`/app/pendientes/${idResult.data}`, "error", error.message);
  if (statusResult.data === "completed" && pending.status !== "completed") await createNextRecurrence(pending);
  revalidatePendingPaths(idResult.data);
  redirectMessage(`/app/pendientes/${idResult.data}`, "success", "El estado fue actualizado.");
}

export async function snoozePending(formData: FormData) {
  const idResult = pendingIdSchema.safeParse(textValue(formData, "pendingId"));
  const until = normalizeLocalDateTime(textValue(formData, "snoozedUntil"));
  if (!idResult.success || !until) redirectMessage("/app/pendientes", "error", "Selecciona una fecha válida para posponer.");
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const { data: current } = await supabase
    .from("global_pendings")
    .select("postponed_count")
    .eq("workspace_id", membership.workspaceId)
    .eq("owner_user_id", user.id)
    .eq("id", idResult.data)
    .maybeSingle();
  const { error } = await supabase
    .from("global_pendings")
    .update({ snoozed_until: until, postponed_count: Number(current?.postponed_count ?? 0) + 1, status: "waiting", updated_by: user.id })
    .eq("workspace_id", membership.workspaceId)
    .eq("owner_user_id", user.id)
    .eq("id", idResult.data);
  if (error) redirectMessage(`/app/pendientes/${idResult.data}`, "error", error.message);
  revalidatePendingPaths(idResult.data);
  redirectMessage(`/app/pendientes/${idResult.data}`, "success", "El pendiente fue pospuesto.");
}

export async function togglePendingSubtask(formData: FormData) {
  const pendingIdResult = pendingIdSchema.safeParse(textValue(formData, "pendingId"));
  const subtaskIdResult = pendingIdSchema.safeParse(textValue(formData, "subtaskId"));
  if (!pendingIdResult.success || !subtaskIdResult.success) redirectMessage("/app/pendientes", "error", "El subpendiente no es válido.");
  const { supabase, membership } = await requireCurrentWorkspace();
  const { error } = await supabase
    .from("pending_subtasks")
    .update({ is_completed: textValue(formData, "isCompleted") !== "true" })
    .eq("workspace_id", membership.workspaceId)
    .eq("pending_id", pendingIdResult.data)
    .eq("id", subtaskIdResult.data);
  if (error) redirectMessage(`/app/pendientes/${pendingIdResult.data}`, "error", error.message);
  revalidatePendingPaths(pendingIdResult.data);
  redirect(`/app/pendientes/${pendingIdResult.data}`);
}

export async function saveVoiceSettings(formData: FormData) {
  const result = voiceSettingsSchema.safeParse({
    recognitionProvider: textValue(formData, "recognitionProvider"),
    synthesisProvider: textValue(formData, "synthesisProvider"),
    language: textValue(formData, "language"),
    timeZone: textValue(formData, "timeZone"),
    voiceName: textValue(formData, "voiceName"),
    speechRate: textValue(formData, "speechRate"),
    speechPitch: textValue(formData, "speechPitch"),
    speechVolume: textValue(formData, "speechVolume"),
    autoReadBriefing: checked(formData, "autoReadBriefing"),
    autoReadAssistant: checked(formData, "autoReadAssistant"),
    confirmationsSpoken: checked(formData, "confirmationsSpoken"),
    saveTranscripts: checked(formData, "saveTranscripts"),
    saveAudio: checked(formData, "saveAudio"),
    browserNotifications: checked(formData, "browserNotifications"),
    dailyBriefingEnabled: checked(formData, "dailyBriefingEnabled"),
    dailyBriefingTime: textValue(formData, "dailyBriefingTime"),
  });
  if (!result.success) redirectMessage("/app/configuracion/voz", "error", firstIssue(result.error));
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const { error } = await supabase.from("voice_settings").upsert({
    workspace_id: membership.workspaceId,
    user_id: user.id,
    recognition_provider: result.data.recognitionProvider,
    synthesis_provider: result.data.synthesisProvider,
    language: result.data.language,
    time_zone: result.data.timeZone,
    voice_name: result.data.voiceName,
    speech_rate: result.data.speechRate,
    speech_pitch: result.data.speechPitch,
    speech_volume: result.data.speechVolume,
    auto_read_briefing: result.data.autoReadBriefing,
    auto_read_assistant: result.data.autoReadAssistant,
    confirmations_spoken: result.data.confirmationsSpoken,
    save_transcripts: result.data.saveTranscripts,
    save_audio: false,
    browser_notifications: result.data.browserNotifications,
    daily_briefing_enabled: result.data.dailyBriefingEnabled,
    daily_briefing_time: result.data.dailyBriefingTime,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,user_id" });
  if (error) redirectMessage("/app/configuracion/voz", "error", error.message);
  revalidatePath("/app/configuracion/voz");
  revalidatePath("/app/hoy");
  redirectMessage("/app/configuracion/voz", "success", "La configuración de voz fue guardada.");
}
