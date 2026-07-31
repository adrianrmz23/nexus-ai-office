import { z } from "zod";

import {
  PENDING_ORIGINS,
  PENDING_PRIORITIES,
  PENDING_RECURRENCES,
  PENDING_STATUSES,
} from "@/modules/pendings/domain/pending";

const optionalDate = z.union([z.literal(""), z.string().date()]).transform((value: string) => value || null);
const optionalTime = z.union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/)]).transform((value: string) => value || null);
const optionalDateTime = z.union([z.literal(""), z.string().datetime({ offset: true })]).transform((value: string) => value || null);
const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((value: string) => value || null);
const optionalInteger = z.union([z.literal(""), z.coerce.number().int()]).transform((value) => value === "" ? null : value);

export const pendingIdSchema = z.string().uuid("El pendiente seleccionado no es válido.");

export const pendingFormSchema = z.object({
  title: z.string().trim().min(2, "El título debe tener al menos 2 caracteres.").max(180),
  description: z.string().trim().max(16_000),
  notes: z.string().trim().max(16_000),
  status: z.enum(PENDING_STATUSES),
  priority: z.enum(PENDING_PRIORITIES),
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  dueDate: optionalDate,
  dueTime: optionalTime,
  reminderAt: optionalDateTime,
  estimatedMinutes: optionalInteger.pipe(z.number().int().min(1).max(10_080).nullable()),
  actualMinutes: optionalInteger.pipe(z.number().int().min(0).max(100_000).nullable()),
  recurrenceType: z.enum(PENDING_RECURRENCES),
  recurrenceInterval: z.coerce.number().int().min(1).max(365),
  recurrenceEndDate: optionalDate,
  sourceConversationId: optionalUuid,
  origin: z.enum(PENDING_ORIGINS),
  subtasks: z.array(z.string().trim().min(1).max(240)).max(30),
}).superRefine((value, context) => {
  if (value.dueTime && !value.dueDate) {
    context.addIssue({ code: "custom", path: ["dueTime"], message: "Selecciona una fecha antes de agregar una hora." });
  }
  if (value.recurrenceType !== "none" && !value.dueDate) {
    context.addIssue({ code: "custom", path: ["recurrenceType"], message: "Un pendiente recurrente necesita fecha de entrega." });
  }
});

export const pendingStatusSchema = z.enum(PENDING_STATUSES);
export const voiceSettingsSchema = z.object({
  recognitionProvider: z.enum(["browser", "disabled"]),
  synthesisProvider: z.enum(["browser", "disabled"]),
  language: z.string().trim().min(2).max(16),
  timeZone: z.string().trim().min(3).max(80).refine((value: string) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
  }, "La zona horaria no es válida."),
  voiceName: z.string().trim().max(160).transform((value) => value || null),
  speechRate: z.coerce.number().min(0.5).max(2),
  speechPitch: z.coerce.number().min(0).max(2),
  speechVolume: z.coerce.number().min(0).max(1),
  autoReadBriefing: z.coerce.boolean(),
  autoReadAssistant: z.coerce.boolean(),
  confirmationsSpoken: z.coerce.boolean(),
  saveTranscripts: z.coerce.boolean(),
  saveAudio: z.coerce.boolean(),
  browserNotifications: z.coerce.boolean(),
  dailyBriefingEnabled: z.coerce.boolean(),
  dailyBriefingTime: z.string().regex(/^\d{2}:\d{2}$/),
});
