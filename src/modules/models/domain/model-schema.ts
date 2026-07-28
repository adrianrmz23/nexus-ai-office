import { z } from "zod";

import {
  MODEL_KINDS,
  MODEL_STATUSES,
  MODEL_TASK_TYPES,
  PROVIDER_STATUSES,
} from "@/modules/models/domain/model";

const optionalPositiveInteger = z.string().trim().transform((value) => (value ? Number(value) : null)).refine(
  (value) => value === null || (Number.isInteger(value) && value > 0),
  "Debe ser un entero positivo.",
);
const optionalNonNegativeNumber = z.string().trim().transform((value) => (value ? Number(value) : null)).refine(
  (value) => value === null || (Number.isFinite(value) && value >= 0),
  "Debe ser un número mayor o igual a cero.",
);
const optionalScore = z.string().trim().transform((value) => (value ? Number(value) : null)).refine(
  (value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 100),
  "La puntuación debe estar entre 0 y 100.",
);

export const uuidSchema = z.string().uuid("El identificador no es válido.");

export const providerSettingsSchema = z.object({
  providerId: uuidSchema,
  displayName: z.string().trim().min(2).max(100),
  baseUrl: z.string().trim().url("La URL base no es válida.").max(500),
  status: z.enum(PROVIDER_STATUSES),
  notes: z.string().trim().max(4000),
});

export const providerCredentialSchema = z.object({
  providerId: uuidSchema,
  apiKey: z.string().trim().min(8, "La clave parece incompleta.").max(1000),
});

export const modelFormSchema = z.object({
  modelId: uuidSchema.optional(),
  providerId: uuidSchema,
  displayName: z.string().trim().min(1).max(160),
  apiIdentifier: z.string().trim().min(1).max(220),
  modelKind: z.enum(MODEL_KINDS),
  status: z.enum(MODEL_STATUSES),
  contextWindow: optionalPositiveInteger,
  maxOutputTokens: optionalPositiveInteger,
  inputCostPerMillion: optionalNonNegativeNumber,
  outputCostPerMillion: optionalNonNegativeNumber,
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  pricingNotes: z.string().trim().max(3000),
  lastReviewedAt: z.string().trim().refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "La fecha no es válida.",
  ),
  notes: z.string().trim().max(5000),
  supportsReasoning: z.boolean().nullable(),
  supportsTools: z.boolean().nullable(),
  supportsStreaming: z.boolean().nullable(),
  supportsVision: z.boolean().nullable(),
  supportsFiles: z.boolean().nullable(),
  supportsStructuredOutput: z.boolean().nullable(),
  supportsEmbeddings: z.boolean().nullable(),
  reasoningScore: optionalScore,
  codingScore: optionalScore,
  designScore: optionalScore,
  visionScore: optionalScore,
  sqlScore: optionalScore,
  longContextScore: optionalScore,
  speedScore: optionalScore,
  taskScores: z.record(z.enum(MODEL_TASK_TYPES), z.number().int().min(0).max(100).nullable()),
  technologyScores: z.record(z.string().uuid(), z.number().int().min(0).max(100).nullable()),
});

export const modelPreferenceSchema = z.object({
  entityId: uuidSchema,
  preferredModelId: z.union([uuidSchema, z.literal("")]).transform((value) => value || null),
  selectionMode: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["automatic", "fixed"]).default("automatic"),
  ),
  alternativeModelIds: z.array(uuidSchema).max(5).refine(
    (ids) => new Set(ids).size === ids.length,
    "No repitas modelos alternativos.",
  ).default([]),
  budgetProfile: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["economy", "balanced", "quality"]).default("balanced"),
  ),
  speedPreference: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["fast", "balanced", "quality"]).default("balanced"),
  ),
}).superRefine((value, context) => {
  if (value.preferredModelId && value.alternativeModelIds.includes(value.preferredModelId)) {
    context.addIssue({
      code: "custom",
      path: ["alternativeModelIds"],
      message: "El modelo principal no debe repetirse como alternativa.",
    });
  }
});
