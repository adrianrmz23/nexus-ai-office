import { z } from "zod";

import {
  CONVERSATION_MODES,
  type ChatAttachmentInput,
} from "@/modules/conversations/domain/conversation";
import { MODEL_TASK_TYPES } from "@/modules/models/domain/model";

export const conversationIdSchema = z.string().uuid("La conversación no es válida.");

export const createConversationSchema = z
  .object({
    projectId: z.string().uuid("Selecciona un proyecto válido."),
    title: z
      .string()
      .trim()
      .min(2, "El título debe tener al menos 2 caracteres.")
      .max(140, "El título no puede superar 140 caracteres."),
    mode: z.enum(CONVERSATION_MODES),
    agentId: z
      .union([z.string().uuid(), z.literal("")])
      .transform((value) => value || null),
    modelId: z
      .union([z.string().uuid(), z.literal("")])
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.mode === "individual" && !value.agentId) {
      context.addIssue({
        code: "custom",
        path: ["agentId"],
        message: "Selecciona un agente para el modo individual.",
      });
    }
  });

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive().max(262_144),
  language: z.string().trim().max(40).nullable(),
  content: z.string().max(300_000),
});

export const chatRequestSchema = z
  .object({
    content: z.string().trim().min(1, "Escribe un mensaje.").max(100_000),
    mode: z.enum(CONVERSATION_MODES),
    agentId: z.string().uuid().nullable(),
    modelId: z.string().uuid().nullable(),
    taskType: z.enum(MODEL_TASK_TYPES),
    attachments: z.array(attachmentSchema).max(3),
  })
  .superRefine((value, context) => {
    const totalBytes = value.attachments.reduce(
      (sum, attachment) => sum + attachment.sizeBytes,
      0,
    );
    if (totalBytes > 524_288) {
      context.addIssue({
        code: "custom",
        path: ["attachments"],
        message: "Los adjuntos no pueden superar 512 KB en total.",
      });
    }
  });

export function normalizeChatAttachments(
  attachments: ChatAttachmentInput[],
): ChatAttachmentInput[] {
  return attachments.map((attachment) => ({
    ...attachment,
    fileName: attachment.fileName.trim(),
    mimeType: attachment.mimeType.trim() || "text/plain",
    language: attachment.language?.trim() || null,
  }));
}
