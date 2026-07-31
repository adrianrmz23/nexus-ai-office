import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), title: z.string().min(2).max(180), dueDate: z.string().date().nullable(), dueTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(), priority: z.enum(["low", "medium", "high", "urgent"]) }),
  z.object({ kind: z.literal("complete"), pendingId: z.string().uuid(), title: z.string() }),
  z.object({ kind: z.literal("start"), pendingId: z.string().uuid(), title: z.string() }),
  z.object({ kind: z.literal("postpone"), pendingId: z.string().uuid(), title: z.string(), dueDate: z.string().date() }),
]);

const requestSchema = z.object({
  transcript: z.string().trim().max(4000).default(""),
  confirm: z.boolean().default(false),
  action: actionSchema.optional(),
  timeZone: z.string().trim().max(80).default("America/Mexico_City"),
});

type VoiceAction = z.infer<typeof actionSchema>;

type Context = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaceId: string;
  saveTranscripts: boolean;
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[¿?¡!.,;]/g, " ").replace(/\s+/g, " ").trim();
}

function dateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localToday(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(year, month - 1, day, 12);
}

function parseDueDate(text: string, timeZone: string): string | null {
  const normalized = normalize(text);
  const base = localToday(timeZone);
  if (normalized.includes("pasado manana")) base.setDate(base.getDate() + 2);
  else if (normalized.includes("manana")) base.setDate(base.getDate() + 1);
  else if (normalized.includes("hoy")) return dateString(base);
  else {
    const iso = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
    const slash = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
    if (slash) return `${slash[3] ?? base.getFullYear()}-${String(Number(slash[2])).padStart(2, "0")}-${String(Number(slash[1])).padStart(2, "0")}`;
    const weekdays: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
    const weekday = Object.entries(weekdays).find(([label]) => normalized.includes(label));
    if (!weekday) return null;
    const target = weekday[1];
    let delta = (target - base.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    base.setDate(base.getDate() + delta);
  }
  return dateString(base);
}

function parseTime(text: string): string | null {
  const normalized = normalize(text);
  const numeric = normalized.match(/(?:a las|a la|alas)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const numberWords: Record<string, number> = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
  const word = Object.entries(numberWords).find(([label]) => new RegExp(`(?:a las|a la) ${label}\\b`).test(normalized));
  if (!numeric && !word) return null;
  let hour = numeric ? Number(numeric[1]) : word![1];
  const minute = numeric?.[2] ? Number(numeric[2]) : 0;
  const period = numeric?.[3];
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parsePriority(text: string): "low" | "medium" | "high" | "urgent" {
  const normalized = normalize(text);
  if (normalized.includes("urgente") || normalized.includes("critica")) return "urgent";
  if (normalized.includes("prioridad alta") || normalized.includes("importante")) return "high";
  if (normalized.includes("prioridad baja")) return "low";
  return "medium";
}

function cleanCreateTitle(text: string): string {
  return text
    .replace(/^(agrega|crear?|anota|registra|recuerdame|añade)(\s+como)?\s+(un\s+)?pendiente\s*/i, "")
    .replace(/^(agrega|crear?|anota|registra|recuerdame|añade)\s*/i, "")
    .replace(/\b(hoy|mañana|pasado mañana|lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b.*$/i, "")
    .replace(/,?\s*prioridad\s+(baja|media|alta|urgente).*$/i, "")
    .trim()
    .replace(/[.,;:]$/, "");
}

async function logCommand(context: Context, transcript: string, intent: string, status: string, responseText: string, action: VoiceAction | null) {
  if (!context.saveTranscripts) return;
  await context.supabase.from("voice_command_logs").insert({
    workspace_id: context.workspaceId,
    user_id: context.userId,
    transcript,
    intent,
    status,
    response_text: responseText,
    action_payload: action ?? {},
  });
}

async function findPending(context: Context, title: string) {
  const term = title.replace(/^(el|la|los|las)\s+/i, "").trim();
  const { data } = await context.supabase
    .from("global_pendings")
    .select("id, title, status, due_date, priority")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_user_id", context.userId)
    .in("status", ["inbox", "pending", "in_progress", "waiting"])
    .ilike("title", `%${term}%`)
    .order("updated_at", { ascending: false })
    .limit(3);
  return data?.[0] ?? null;
}

async function summarize(context: Context, transcript: string, timeZone: string) {
  const normalized = normalize(transcript);
  const today = dateString(localToday(timeZone));
  const week = localToday(timeZone);
  week.setDate(week.getDate() + 7);
  let query = context.supabase
    .from("global_pendings")
    .select("id, title, due_date, due_time, priority, status")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_user_id", context.userId)
    .in("status", ["inbox", "pending", "in_progress", "waiting"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20);
  let label = "activos";
  if (normalized.includes("vencid")) { query = query.lt("due_date", today); label = "vencidos"; }
  else if (normalized.includes("hoy")) { query = query.eq("due_date", today); label = "para hoy"; }
  else if (normalized.includes("semana")) { query = query.gte("due_date", today).lte("due_date", dateString(week)); label = "para esta semana"; }
  if (normalized.includes("urgent")) { query = query.eq("priority", "urgent"); label = `urgentes ${label}`; }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; title: string; due_date: string | null; due_time: string | null; priority: string; status: string }>;
  const message = rows.length
    ? `Tienes ${rows.length} pendientes ${label}. ${rows.slice(0, 5).map((item, index) => `${index + 1}: ${item.title}${item.due_date ? `, fecha ${item.due_date}` : ""}`).join(". ")}.`
    : `No tienes pendientes ${label}.`;
  await logCommand(context, transcript, "query", "completed", message, null);
  return NextResponse.json({ ok: true, message });
}

async function applyAction(context: Context, transcript: string, action: VoiceAction) {
  let message = "Acción completada.";
  if (action.kind === "create") {
    const { data, error } = await context.supabase.rpc("create_global_pending_record", {
      p_workspace_id: context.workspaceId,
      p_title: action.title,
      p_description: "",
      p_notes: "Creado mediante comando de voz.",
      p_status: "pending",
      p_priority: action.priority,
      p_category: "General",
      p_tags: ["voz"],
      p_due_date: action.dueDate,
      p_due_time: action.dueTime,
      p_reminder_at: null,
      p_estimated_minutes: null,
      p_recurrence_type: "none",
      p_recurrence_interval: 1,
      p_recurrence_end_date: null,
      p_origin: "voice",
      p_source_conversation_id: null,
      p_recurring_parent_id: null,
      p_subtasks: [],
    });
    if (error || typeof data !== "string") throw new Error(error?.message ?? "No pudimos crear el pendiente.");
    message = `Pendiente creado: ${action.title}${action.dueDate ? ` para ${action.dueDate}` : ""}.`;
  } else {
    const update: Record<string, unknown> = { updated_by: context.userId };
    if (action.kind === "complete") update.status = "completed";
    if (action.kind === "start") update.status = "in_progress";
    if (action.kind === "postpone") { update.due_date = action.dueDate; update.snoozed_until = null; }
    const { error } = await context.supabase
      .from("global_pendings")
      .update(update)
      .eq("workspace_id", context.workspaceId)
      .eq("owner_user_id", context.userId)
      .eq("id", action.pendingId);
    if (error) throw new Error(error.message);
    message = action.kind === "complete" ? `Pendiente completado: ${action.title}.` : action.kind === "start" ? `Pendiente iniciado: ${action.title}.` : `Pendiente pospuesto para ${action.dueDate}: ${action.title}.`;
  }
  await logCommand(context, transcript, action.kind, "completed", message, action);
  return NextResponse.json({ ok: true, message, mutated: true });
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "El comando no es válido." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Debes iniciar sesión." }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ ok: false, message: "No encontramos una oficina activa." }, { status: 403 });
  const { data: settings } = await supabase.from("voice_settings").select("save_transcripts").eq("workspace_id", membership.workspace_id).eq("user_id", user.id).maybeSingle();
  const context: Context = { supabase, userId: user.id, workspaceId: membership.workspace_id, saveTranscripts: settings?.save_transcripts !== false };

  try {
    if (parsed.data.confirm && parsed.data.action) return await applyAction(context, parsed.data.transcript, parsed.data.action);
    const transcript = parsed.data.transcript;
    const normalized = normalize(transcript);
    if (!normalized) return NextResponse.json({ ok: false, message: "Di o escribe un comando." }, { status: 400 });

    if (/^(que|cuales|dime|muestra|lista|resumen|tengo)/.test(normalized) || normalized.includes("pendientes tengo")) {
      return await summarize(context, transcript, parsed.data.timeZone);
    }

    if (/^(agrega|crear?|anota|registra|recuerdame|anade)/.test(normalized)) {
      const title = cleanCreateTitle(transcript);
      if (title.length < 2) return NextResponse.json({ ok: false, message: "No pude identificar el título del pendiente." });
      const action: VoiceAction = { kind: "create", title, dueDate: parseDueDate(transcript, parsed.data.timeZone), dueTime: parseTime(transcript), priority: parsePriority(transcript) };
      const message = `Voy a crear “${title}”${action.dueDate ? ` para ${action.dueDate}` : " sin fecha"}, prioridad ${action.priority}. ¿Confirmas?`;
      await logCommand(context, transcript, "create", "parsed", message, action);
      return NextResponse.json({ ok: true, message, requiresConfirmation: true, action });
    }

    const completeMatch = normalized.match(/^(marca como completado|marca completado|completa|termina)\s+(.+)$/);
    if (completeMatch) {
      const pending = await findPending(context, completeMatch[2]);
      if (!pending) return NextResponse.json({ ok: false, message: "No encontré un pendiente activo con ese nombre." });
      const action: VoiceAction = { kind: "complete", pendingId: pending.id, title: pending.title };
      const message = `Voy a marcar como completado “${pending.title}”. ¿Confirmas?`;
      await logCommand(context, transcript, "complete", "parsed", message, action);
      return NextResponse.json({ ok: true, message, requiresConfirmation: true, action });
    }

    const startMatch = normalized.match(/^(inicia|empieza)\s+(.+)$/);
    if (startMatch) {
      const pending = await findPending(context, startMatch[2]);
      if (!pending) return NextResponse.json({ ok: false, message: "No encontré un pendiente activo con ese nombre." });
      const action: VoiceAction = { kind: "start", pendingId: pending.id, title: pending.title };
      const message = `Voy a iniciar “${pending.title}”. ¿Confirmas?`;
      await logCommand(context, transcript, "start", "parsed", message, action);
      return NextResponse.json({ ok: true, message, requiresConfirmation: true, action });
    }

    const postponeMatch = normalized.match(/^(pospon|aplaza|reprograma)\s+(.+?)\s+para\s+(.+)$/);
    if (postponeMatch) {
      const pending = await findPending(context, postponeMatch[2]);
      const dueDate = parseDueDate(postponeMatch[3], parsed.data.timeZone);
      if (!pending) return NextResponse.json({ ok: false, message: "No encontré un pendiente activo con ese nombre." });
      if (!dueDate) return NextResponse.json({ ok: false, message: "No pude identificar la nueva fecha." });
      const action: VoiceAction = { kind: "postpone", pendingId: pending.id, title: pending.title, dueDate };
      const message = `Voy a posponer “${pending.title}” para ${dueDate}. ¿Confirmas?`;
      await logCommand(context, transcript, "postpone", "parsed", message, action);
      return NextResponse.json({ ok: true, message, requiresConfirmation: true, action });
    }

    const message = "No entendí el comando. Puedes crear, consultar, iniciar, completar o posponer pendientes.";
    await logCommand(context, transcript, "unknown", "failed", message, null);
    return NextResponse.json({ ok: false, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos procesar el comando.";
    await logCommand(context, parsed.data.transcript, "error", "failed", message, parsed.data.action ?? null);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
