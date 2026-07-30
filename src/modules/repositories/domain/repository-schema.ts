import { z } from "zod";

export const repositoryIdSchema = z.string().uuid("El repositorio no es válido.");
export const projectFileIdSchema = z.string().uuid("El archivo no es válido.");
export const fileProposalIdSchema = z.string().uuid("La propuesta no es válida.");

export const importRepositorySchema = z.object({
  projectId: z.string().uuid("Selecciona un proyecto válido."),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(180, "El nombre no puede superar 180 caracteres."),
  repositoryUrl: z
    .union([z.string().trim().url("La URL del repositorio no es válida."), z.literal("")])
    .transform((value) => value || null),
  defaultBranch: z
    .string()
    .trim()
    .min(1, "Indica la rama principal.")
    .max(120, "La rama no puede superar 120 caracteres."),
});

export const proposalFormSchema = z.object({
  fileId: projectFileIdSchema,
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(8_000),
  proposedContent: z.string().min(1).max(1_100_000),
  conversationId: z
    .union([z.string().uuid(), z.literal("")])
    .transform((value) => value || null),
  sourceMessageId: z
    .union([z.string().uuid(), z.literal("")])
    .transform((value) => value || null),
  proposedByAgentId: z
    .union([z.string().uuid(), z.literal("")])
    .transform((value) => value || null),
});

export const reviewProposalSchema = z.object({
  proposalId: fileProposalIdSchema,
  status: z.enum(["changes_requested", "approved", "rejected"]),
  reviewNote: z.string().trim().max(8_000),
});

export const conversationFileContextSchema = z.object({
  fileId: projectFileIdSchema,
  selected: z.boolean(),
});
