import { z } from "zod";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((value: string) => value || null);

export const decisionSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  context: z.string().trim().max(12_000),
  decision: z.string().trim().min(3).max(16_000),
  consequences: z.string().trim().max(12_000),
  status: z.enum(["proposed", "accepted", "superseded", "rejected"]),
  conversationId: optionalUuid,
  sourceMessageId: optionalUuid,
  agentId: optionalUuid,
});

export const errorSolutionSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  errorSignature: z.string().trim().max(4_000),
  symptoms: z.string().trim().max(12_000),
  rootCause: z.string().trim().max(16_000),
  solution: z.string().trim().min(3).max(24_000),
  validationSteps: z.string().trim().max(12_000),
  status: z.enum(["open", "resolved", "verified", "archived"]),
  conversationId: optionalUuid,
  sourceMessageId: optionalUuid,
  agentId: optionalUuid,
});
