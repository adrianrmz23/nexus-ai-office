import { z } from "zod";

import { ANALYTICS_RANGES, FEEDBACK_VERDICTS } from "@/modules/analytics/domain/analytics";

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.uuid().nullable(),
);

export const analyticsFiltersSchema = z.object({
  range: z.enum(ANALYTICS_RANGES).default("30d"),
  projectId: optionalUuid,
});

export const feedbackFormSchema = z.object({
  messageId: z.uuid("El mensaje no es válido."),
  verdict: z.enum(FEEDBACK_VERDICTS),
  rating: z.coerce.number().int().min(1).max(5),
  correctionCount: z.coerce.number().int().min(0).max(99).default(0),
  notes: z.string().trim().max(4000).default(""),
  estimatedMinutesSaved: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().int().min(0).max(1440).nullable(),
  ),
});

export const analyticsSettingsSchema = z.object({
  displayCurrency: z.string().trim().toUpperCase().length(3),
  usdToDisplayRate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().positive().max(100000).nullable(),
  ),
  acceptedMinutesSaved: z.coerce.number().int().min(0).max(1440),
  partialMinutesSaved: z.coerce.number().int().min(0).max(1440),
  rejectedMinutesSaved: z.coerce.number().int().min(0).max(1440),
});

export const budgetFormSchema = z.object({
  projectId: optionalUuid,
  limitAmount: z.coerce.number().positive().max(100000000),
  currency: z.string().trim().toUpperCase().length(3),
  warningThreshold: z.coerce.number().int().min(1).max(100),
});

export const manualRecommendationSchema = z.object({
  projectId: optionalUuid,
  taskType: z.enum([
    "general",
    "coding",
    "debugging",
    "sql",
    "design",
    "architecture",
    "qa",
    "analysis",
    "content",
  ]),
  recommendedModelId: z.uuid(),
  selectedModelId: z.uuid(),
  economyModelId: optionalUuid,
  qualityModelId: optionalUuid,
  score: z.number().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  reasons: z.array(z.string().max(500)).max(20),
  requestContext: z.record(z.string(), z.unknown()),
});
