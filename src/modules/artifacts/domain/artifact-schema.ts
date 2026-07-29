import { z } from "zod";

import { ARTIFACT_STATUSES, ARTIFACT_TYPES } from "@/modules/artifacts/domain/artifact";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((value: string) => value || null);

export const artifactIdSchema = z.string().uuid("El artefacto seleccionado no es válido.");
export const artifactVersionNumberSchema = z.coerce.number().int().min(1);

export const artifactFormSchema = z.object({
  projectId: z.string().uuid("Selecciona un proyecto válido."),
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(180),
  artifactType: z.enum(ARTIFACT_TYPES),
  language: z.string().trim().max(80),
  filePath: z.string().trim().max(500),
  content: z.string().min(1, "El contenido no puede estar vacío.").max(300_000),
  changeSummary: z.string().trim().max(4_000),
  taskId: optionalUuid,
  conversationId: optionalUuid,
  sourceMessageId: optionalUuid,
  createdByAgentId: optionalUuid,
});

export const artifactVersionSchema = z.object({
  artifactId: artifactIdSchema,
  content: z.string().min(1).max(300_000),
  changeSummary: z.string().trim().min(3, "Resume qué cambió en esta versión.").max(4_000),
  sourceMessageId: optionalUuid,
  createdByAgentId: optionalUuid,
});

export const artifactReviewSchema = z.object({
  artifactId: artifactIdSchema,
  status: z.enum(ARTIFACT_STATUSES),
  reviewNote: z.string().trim().max(8_000),
  reviewerAgentId: optionalUuid,
});
