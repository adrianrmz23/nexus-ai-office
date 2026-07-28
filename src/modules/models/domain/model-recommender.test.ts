import { describe, expect, it } from "vitest";

import { recommendModels } from "@/modules/models/domain/model-recommender";
import type { AIModelRecord } from "@/modules/models/domain/model";

function model(overrides: Partial<AIModelRecord> = {}): AIModelRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspace_id: "22222222-2222-4222-8222-222222222222",
    provider_id: "33333333-3333-4333-8333-333333333333",
    display_name: "Modelo",
    api_identifier: "model",
    model_kind: "chat",
    status: "active",
    context_window: 128000,
    max_output_tokens: 8192,
    input_cost_per_million: 2,
    output_cost_per_million: 8,
    currency: "USD",
    pricing_notes: "",
    last_reviewed_at: null,
    last_synced_at: null,
    source_metadata: {},
    notes: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    archived_at: null,
    provider: {
      id: "33333333-3333-4333-8333-333333333333",
      display_name: "Proveedor",
      provider_type: "openai",
      color: "#55e6c1",
      status: "active",
      health_status: "healthy",
    },
    capabilities: {
      model_id: "11111111-1111-4111-8111-111111111111",
      workspace_id: "22222222-2222-4222-8222-222222222222",
      supports_reasoning: true,
      supports_tools: true,
      supports_streaming: true,
      supports_vision: false,
      supports_files: true,
      supports_structured_output: true,
      supports_embeddings: false,
      reasoning_score: 90,
      coding_score: 90,
      design_score: 60,
      vision_score: 30,
      sql_score: 85,
      long_context_score: 80,
      speed_score: 70,
    },
    taskScores: { coding: 92 },
    technologyScores: {},
    ...overrides,
  };
}

const input = {
  taskType: "coding" as const,
  technologyIds: [],
  requiresReasoning: false,
  requiresVision: false,
  requiresTools: false,
  requiresFiles: false,
  estimatedContextTokens: 10000,
  budgetProfile: "balanced" as const,
  speedPreference: "balanced" as const,
};

describe("recommendModels", () => {
  it("prioriza la mejor puntuación de tarea", () => {
    const strong = model({ taskScores: { coding: 95 } });
    const weak = model({ id: "44444444-4444-4444-8444-444444444444", taskScores: { coding: 40 } });
    expect(recommendModels([weak, strong], input)[0]?.model.id).toBe(strong.id);
  });
  it("descarta modelos inactivos", () => {
    expect(recommendModels([model({ status: "inactive" })], input)).toHaveLength(0);
  });
  it("descarta capacidades explícitamente incompatibles", () => {
    expect(recommendModels([model()], { ...input, requiresVision: true })).toHaveLength(0);
  });
  it("descarta contexto insuficiente conocido", () => {
    expect(recommendModels([model({ context_window: 8000 })], { ...input, estimatedContextTokens: 12000 })).toHaveLength(0);
  });
});
