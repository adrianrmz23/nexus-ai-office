import { z } from "zod";

import { MEMORY_SCOPES, MEMORY_STATUSES, MEMORY_TYPES } from "@/modules/memory/domain/memory";

const optionalUuid = z.union([z.literal(""), z.uuid()]).transform((value) => value || null);

export const memoryIdSchema = z.uuid("La memoria no es válida.");
export const documentIdSchema = z.uuid("El documento no es válido.");

export const createMemorySchema = z
  .object({
    scopeType: z.enum(MEMORY_SCOPES),
    projectId: optionalUuid,
    agentId: optionalUuid,
    conversationId: optionalUuid,
    memoryType: z.enum(MEMORY_TYPES),
    title: z.string().trim().min(1, "Escribe un título.").max(180),
    content: z.string().trim().min(1, "Escribe el contenido de la memoria.").max(12_000),
    importance: z.coerce.number().int().min(1).max(100),
  })
  .superRefine((value, context) => {
    if (value.scopeType === "project" && !value.projectId) {
      context.addIssue({ code: "custom", path: ["projectId"], message: "Selecciona un proyecto." });
    }
  });

export const memoryStatusSchema = z.enum(MEMORY_STATUSES);

export const uploadDocumentSchema = z
  .object({
    scopeType: z.enum(["global", "project"]),
    projectId: optionalUuid,
    title: z.string().trim().max(180),
  })
  .superRefine((value, context) => {
    if (value.scopeType === "project" && !value.projectId) {
      context.addIssue({ code: "custom", path: ["projectId"], message: "Selecciona un proyecto." });
    }
  });
