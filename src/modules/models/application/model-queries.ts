import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import { calculateModelHistoryScore } from "@/modules/models/domain/model-history-score";
import type {
  AIModelRecord,
  AIProviderRecord,
  ModelCapabilitiesRecord,
  ModelTaskType,
} from "@/modules/models/domain/model";

export type ModelOption = {
  id: string;
  displayName: string;
  apiIdentifier: string;
  providerName: string;
  providerColor: string;
};

type RawProviderJoin = Pick<
  AIProviderRecord,
  "id" | "display_name" | "provider_type" | "color" | "status" | "health_status"
>;
type RawModel = Omit<
  AIModelRecord,
  "provider" | "capabilities" | "taskScores" | "technologyScores"
> & {
  ai_providers: RawProviderJoin | RawProviderJoin[] | null;
};

export async function loadProviders(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<AIProviderRecord[]> {
  const { data, error } = await supabase
    .from("ai_providers")
    .select(
      "id, workspace_id, slug, display_name, provider_type, base_url, icon, color, status, credential_status, credential_last_four, health_status, last_checked_at, last_error, notes, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", workspaceId)
    .order("display_name");
  if (error) {
    throw new Error(`No pudimos cargar los proveedores: ${error.message}`);
  }
  return (data ?? []) as AIProviderRecord[];
}

export async function loadModelCatalog(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters?: { providerId?: string; status?: string; search?: string },
): Promise<AIModelRecord[]> {
  let query = supabase
    .from("ai_models")
    .select(
      "id, workspace_id, provider_id, display_name, api_identifier, model_kind, status, context_window, max_output_tokens, input_cost_per_million, output_cost_per_million, currency, pricing_notes, last_reviewed_at, last_synced_at, source_metadata, notes, created_at, updated_at, archived_at, ai_providers(id, display_name, provider_type, color, status, health_status)",
    )
    .eq("workspace_id", workspaceId)
    .order("display_name")
    .limit(2000);
  if (filters?.providerId) query = query.eq("provider_id", filters.providerId);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.search) {
    const safeSearch = filters.search.replace(/[,%()"'\\]/g, " ").trim();
    if (safeSearch) {
      query = query.or(
        `display_name.ilike.%${safeSearch}%,api_identifier.ilike.%${safeSearch}%`,
      );
    }
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(`No pudimos cargar el catálogo de modelos: ${error.message}`);
  }
  const rawModels = (data ?? []) as unknown as RawModel[];
  if (!rawModels.length) return [];
  const modelIds = rawModels.map((model) => model.id);
  const [capabilitiesResult, taskScoresResult, technologyScoresResult] = await Promise.all([
    supabase
      .from("model_capabilities")
      .select(
        "model_id, workspace_id, supports_reasoning, supports_tools, supports_streaming, supports_vision, supports_files, supports_structured_output, supports_embeddings, reasoning_score, coding_score, design_score, vision_score, sql_score, long_context_score, speed_score",
      )
      .eq("workspace_id", workspaceId)
      .in("model_id", modelIds),
    supabase
      .from("model_task_scores")
      .select("model_id, task_type, score")
      .eq("workspace_id", workspaceId)
      .in("model_id", modelIds),
    supabase
      .from("model_technology_scores")
      .select("model_id, technology_id, score")
      .eq("workspace_id", workspaceId)
      .in("model_id", modelIds),
  ]);
  const relationError =
    capabilitiesResult.error ?? taskScoresResult.error ?? technologyScoresResult.error;
  if (relationError) {
    throw new Error(`No pudimos cargar las evaluaciones de modelos: ${relationError.message}`);
  }
  const capabilitiesByModel = new Map<string, ModelCapabilitiesRecord>();
  for (const item of capabilitiesResult.data ?? []) {
    capabilitiesByModel.set(item.model_id, item as ModelCapabilitiesRecord);
  }
  const taskScoresByModel = new Map<string, Partial<Record<ModelTaskType, number>>>();
  for (const item of taskScoresResult.data ?? []) {
    const current = taskScoresByModel.get(item.model_id) ?? {};
    current[item.task_type as ModelTaskType] = item.score;
    taskScoresByModel.set(item.model_id, current);
  }
  const technologyScoresByModel = new Map<string, Record<string, number>>();
  for (const item of technologyScoresResult.data ?? []) {
    const current = technologyScoresByModel.get(item.model_id) ?? {};
    current[item.technology_id] = item.score;
    technologyScoresByModel.set(item.model_id, current);
  }
  return rawModels.map((raw) => {
    const provider = Array.isArray(raw.ai_providers) ? raw.ai_providers[0] : raw.ai_providers;
    const { ai_providers: _ignored, ...model } = raw;
    void _ignored;
    return {
      ...model,
      input_cost_per_million:
        model.input_cost_per_million === null ? null : Number(model.input_cost_per_million),
      output_cost_per_million:
        model.output_cost_per_million === null ? null : Number(model.output_cost_per_million),
      provider: provider ?? undefined,
      capabilities: capabilitiesByModel.get(model.id) ?? null,
      taskScores: taskScoresByModel.get(model.id) ?? {},
      technologyScores: technologyScoresByModel.get(model.id) ?? {},
    } as AIModelRecord;
  });
}

export async function loadRecommendationCatalog(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  input: { taskType: ModelTaskType; technologyIds: string[] },
): Promise<AIModelRecord[]> {
  const { data, error } = await supabase
    .from("ai_models")
    .select(
      "id, workspace_id, provider_id, display_name, api_identifier, model_kind, status, context_window, max_output_tokens, input_cost_per_million, output_cost_per_million, currency, pricing_notes, last_reviewed_at, last_synced_at, source_metadata, notes, created_at, updated_at, archived_at, ai_providers!inner(id, display_name, provider_type, color, status, health_status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .eq("ai_providers.status", "active")
    .in("model_kind", ["chat", "reasoning", "multimodal"])
    .order("display_name")
    .limit(500);

  if (error) {
    throw new Error(`No pudimos cargar modelos recomendables: ${error.message}`);
  }

  const rawModels = (data ?? []) as unknown as RawModel[];
  if (!rawModels.length) return [];
  const modelIds = rawModels.map((model) => model.id);

  const [capabilitiesResult, taskScoresResult, technologyScoresResult, feedbackResult] = await Promise.all([
    supabase
      .from("model_capabilities")
      .select(
        "model_id, workspace_id, supports_reasoning, supports_tools, supports_streaming, supports_vision, supports_files, supports_structured_output, supports_embeddings, reasoning_score, coding_score, design_score, vision_score, sql_score, long_context_score, speed_score",
      )
      .eq("workspace_id", workspaceId)
      .in("model_id", modelIds),
    supabase
      .from("model_task_scores")
      .select("model_id, task_type, score")
      .eq("workspace_id", workspaceId)
      .eq("task_type", input.taskType)
      .in("model_id", modelIds),
    input.technologyIds.length
      ? supabase
          .from("model_technology_scores")
          .select("model_id, technology_id, score")
          .eq("workspace_id", workspaceId)
          .in("technology_id", input.technologyIds)
          .in("model_id", modelIds)
      : Promise.resolve({
          data: [] as Array<{ model_id: string; technology_id: string; score: number }>,
        }),
    supabase
      .from("user_feedback")
      .select("model_id, rating, verdict, correction_count")
      .eq("workspace_id", workspaceId)
      .in("model_id", modelIds)
      .gte("created_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const capabilitiesByModel = new Map<string, ModelCapabilitiesRecord>();
  for (const item of capabilitiesResult.data ?? []) {
    capabilitiesByModel.set(item.model_id, item as ModelCapabilitiesRecord);
  }
  const taskScoresByModel = new Map<string, Partial<Record<ModelTaskType, number>>>();
  for (const item of taskScoresResult.data ?? []) {
    taskScoresByModel.set(item.model_id, {
      [item.task_type as ModelTaskType]: item.score,
    });
  }
  const technologyScoresByModel = new Map<string, Record<string, number>>();
  for (const item of technologyScoresResult.data ?? []) {
    const current = technologyScoresByModel.get(item.model_id) ?? {};
    current[item.technology_id] = item.score;
    technologyScoresByModel.set(item.model_id, current);
  }
  const feedbackByModel = new Map<string, Array<{ rating: number; verdict: "accepted" | "partial" | "rejected"; correctionCount: number }>>();
  for (const item of feedbackResult.data ?? []) {
    if (!item.model_id) continue;
    const current = feedbackByModel.get(item.model_id) ?? [];
    current.push({
      rating: Number(item.rating),
      verdict: item.verdict as "accepted" | "partial" | "rejected",
      correctionCount: Number(item.correction_count ?? 0),
    });
    feedbackByModel.set(item.model_id, current);
  }

  return rawModels.map((raw) => {
    const provider = Array.isArray(raw.ai_providers) ? raw.ai_providers[0] : raw.ai_providers;
    const { ai_providers: _ignored, ...model } = raw;
    void _ignored;
    const history = calculateModelHistoryScore(feedbackByModel.get(model.id) ?? []);
    return {
      ...model,
      input_cost_per_million:
        model.input_cost_per_million === null ? null : Number(model.input_cost_per_million),
      output_cost_per_million:
        model.output_cost_per_million === null ? null : Number(model.output_cost_per_million),
      provider: provider ?? undefined,
      capabilities: capabilitiesByModel.get(model.id) ?? null,
      taskScores: taskScoresByModel.get(model.id) ?? {},
      technologyScores: technologyScoresByModel.get(model.id) ?? {},
      historyScore: history.score,
      historySamples: history.samples,
    } as AIModelRecord;
  });
}

export async function loadActiveModelOptions(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<ModelOption[]> {
  const models = await loadModelCatalog(supabase, workspaceId, { status: "active" });
  return models
    .filter((model) => model.provider?.status === "active")
    .map((model) => ({
      id: model.id,
      displayName: model.display_name,
      apiIdentifier: model.api_identifier,
      providerName: model.provider?.display_name ?? "Proveedor",
      providerColor: model.provider?.color ?? "#55e6c1",
    }));
}
