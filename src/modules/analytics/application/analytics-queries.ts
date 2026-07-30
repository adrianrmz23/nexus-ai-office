import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  AgentPerformanceRow,
  AnalyticsDashboardData,
  AnalyticsFilters,
  AnalyticsSettings,
  BudgetStatus,
  FeedbackVerdict,
  ModelPerformanceRow,
  ProjectPerformanceRow,
  ProviderPerformanceRow,
  RecommendationHistoryRow,
} from "@/modules/analytics/domain/analytics";

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function rangeStart(range: AnalyticsFilters["range"]): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? null;
}

function convertCost(
  amount: number | null,
  currency: string,
  settings: AnalyticsSettings,
): number | null {
  if (amount === null) return null;
  const source = currency.toUpperCase();
  const target = settings.displayCurrency.toUpperCase();
  if (source === target) return amount;
  if (!settings.usdToDisplayRate) return null;
  if (source === "USD" && target === "MXN") return amount * settings.usdToDisplayRate;
  if (source === "MXN" && target === "USD") return amount / settings.usdToDisplayRate;
  return null;
}

function defaultSettings(): AnalyticsSettings {
  return {
    displayCurrency: "MXN",
    usdToDisplayRate: null,
    acceptedMinutesSaved: 25,
    partialMinutesSaved: 12,
    rejectedMinutesSaved: 0,
  };
}

function historyScore(input: {
  ratings: number[];
  verdicts: FeedbackVerdict[];
  corrections: number[];
}): number {
  if (!input.ratings.length) return 50;
  const values = input.ratings.map((rating, index) => {
    const verdict = input.verdicts[index] ?? "partial";
    const correctionCount = input.corrections[index] ?? 0;
    const verdictAdjustment = verdict === "accepted" ? 10 : verdict === "rejected" ? -20 : 0;
    return Math.max(0, Math.min(100, rating * 20 + verdictAdjustment - correctionCount * 5));
  });
  return rounded(average(values) ?? 50, 1);
}

export async function loadAnalyticsProjects(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name");
  if (error) throw new Error(`No pudimos consultar los proyectos: ${error.message}`);
  return (data ?? []) as Array<{ id: string; name: string; color: string; status: string }>;
}

export async function loadMessageFeedback(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  conversationId: string,
  userId: string,
): Promise<Map<string, { id: string; verdict: FeedbackVerdict; rating: number; correctionCount: number; notes: string; estimatedMinutesSaved: number | null }>> {
  const { data, error } = await supabase
    .from("user_feedback")
    .select("id, message_id, verdict, rating, correction_count, notes, estimated_minutes_saved")
    .eq("workspace_id", workspaceId)
    .eq("conversation_id", conversationId)
    .eq("created_by", userId);
  if (error) throw new Error(`No pudimos consultar la retroalimentación: ${error.message}`);
  return new Map(
    (data ?? []).map((row) => [
      row.message_id,
      {
        id: row.id,
        verdict: row.verdict as FeedbackVerdict,
        rating: Number(row.rating),
        correctionCount: Number(row.correction_count),
        notes: row.notes ?? "",
        estimatedMinutesSaved:
          row.estimated_minutes_saved === null ? null : Number(row.estimated_minutes_saved),
      },
    ]),
  );
}

export async function loadAnalyticsDashboard(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters: AnalyticsFilters,
): Promise<AnalyticsDashboardData> {
  const start = rangeStart(filters.range);
  const projectId = filters.projectId;

  const settingsResult = await supabase
    .from("analytics_settings")
    .select(
      "display_currency, usd_to_display_rate, accepted_minutes_saved, partial_minutes_saved, rejected_minutes_saved",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const settings: AnalyticsSettings = settingsResult.data
    ? {
        displayCurrency: String(settingsResult.data.display_currency ?? "MXN"),
        usdToDisplayRate: numberOrNull(settingsResult.data.usd_to_display_rate),
        acceptedMinutesSaved: Number(settingsResult.data.accepted_minutes_saved ?? 25),
        partialMinutesSaved: Number(settingsResult.data.partial_minutes_saved ?? 12),
        rejectedMinutesSaved: Number(settingsResult.data.rejected_minutes_saved ?? 0),
      }
    : defaultSettings();

  let runsQuery = supabase
    .from("agent_runs")
    .select(
      "id, project_id, conversation_id, assistant_message_id, agent_id, model_id, provider_id, mode, task_type, status, input_tokens, output_tokens, estimated_cost, currency, duration_ms, run_kind, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(5000);
  let usageQuery = supabase
    .from("model_usage")
    .select(
      "id, project_id, conversation_id, run_id, provider_id, model_id, input_tokens, output_tokens, total_tokens, estimated_cost, currency, duration_ms, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(5000);
  let feedbackQuery = supabase
    .from("user_feedback")
    .select(
      "id, project_id, conversation_id, message_id, run_id, recommendation_event_id, agent_id, model_id, provider_id, verdict, rating, correction_count, estimated_minutes_saved, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(5000);
  let handoffQuery = supabase
    .from("agent_handoffs")
    .select(
      "id, project_id, source_agent_id, target_agent_id, provider_id, model_id, status, input_tokens, output_tokens, estimated_cost, currency, duration_ms, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(5000);
  let teamExecutionQuery = supabase
    .from("team_executions")
    .select("id, project_id, status, duration_ms, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(5000);
  let recommendationQuery = supabase
    .from("model_recommendation_events")
    .select(
      "id, project_id, conversation_id, run_id, task_type, source, recommended_model_id, selected_model_id, recommendation_score, confidence, was_overridden, created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (start) {
    runsQuery = runsQuery.gte("created_at", start);
    usageQuery = usageQuery.gte("created_at", start);
    feedbackQuery = feedbackQuery.gte("created_at", start);
    handoffQuery = handoffQuery.gte("created_at", start);
    teamExecutionQuery = teamExecutionQuery.gte("created_at", start);
    recommendationQuery = recommendationQuery.gte("created_at", start);
  }
  if (projectId) {
    runsQuery = runsQuery.eq("project_id", projectId);
    usageQuery = usageQuery.eq("project_id", projectId);
    feedbackQuery = feedbackQuery.eq("project_id", projectId);
    handoffQuery = handoffQuery.eq("project_id", projectId);
    teamExecutionQuery = teamExecutionQuery.eq("project_id", projectId);
    recommendationQuery = recommendationQuery.eq("project_id", projectId);
  }

  const [
    runsResult,
    usageResult,
    feedbackResult,
    handoffResult,
    teamExecutionResult,
    recommendationResult,
  ] = await Promise.all([
    runsQuery,
    usageQuery,
    feedbackQuery,
    handoffQuery,
    teamExecutionQuery,
    recommendationQuery,
  ]);

  const firstError = [
    runsResult.error,
    usageResult.error,
    feedbackResult.error,
    handoffResult.error,
    teamExecutionResult.error,
    recommendationResult.error,
  ].find(Boolean);
  if (firstError) throw new Error(`No pudimos cargar la analítica: ${firstError.message}`);

  const runs = (runsResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const usage = (usageResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const feedback = (feedbackResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const handoffs = (handoffResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const teamExecutions = (teamExecutionResult.data ?? []) as unknown as Array<Record<string, unknown>>;
  const recommendations = (recommendationResult.data ?? []) as unknown as Array<Record<string, unknown>>;

  const modelIds = new Set<string>();
  const providerIds = new Set<string>();
  const agentIds = new Set<string>();
  for (const row of [
    ...runs,
    ...usage,
    ...feedback,
    ...handoffs,
    ...teamExecutions,
    ...recommendations,
  ]) {
    if (row.model_id) modelIds.add(String(row.model_id));
    if (row.recommended_model_id) modelIds.add(String(row.recommended_model_id));
    if (row.selected_model_id) modelIds.add(String(row.selected_model_id));
    if (row.provider_id) providerIds.add(String(row.provider_id));
    if (row.agent_id) agentIds.add(String(row.agent_id));
    if (row.source_agent_id) agentIds.add(String(row.source_agent_id));
    if (row.target_agent_id) agentIds.add(String(row.target_agent_id));
  }

  const [projectsResult, modelsResult, providersResult, agentsResult, budgetsResult, tasksResult, artifactsResult, monthUsageResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, color")
        .eq("workspace_id", workspaceId),
      modelIds.size
        ? supabase
            .from("ai_models")
            .select("id, display_name, provider_id")
            .eq("workspace_id", workspaceId)
            .in("id", [...modelIds])
        : Promise.resolve({ data: [], error: null }),
      providerIds.size
        ? supabase
            .from("ai_providers")
            .select("id, display_name, color")
            .eq("workspace_id", workspaceId)
            .in("id", [...providerIds])
        : Promise.resolve({ data: [], error: null }),
      agentIds.size
        ? supabase
            .from("agents")
            .select("id, name, role, color")
            .eq("workspace_id", workspaceId)
            .in("id", [...agentIds])
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("usage_budgets")
        .select("id, project_id, limit_amount, currency, warning_threshold")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("project_id", { ascending: true, nullsFirst: true }),
      supabase
        .from("tasks")
        .select("project_id, status")
        .eq("workspace_id", workspaceId)
        .in("status", ["backlog", "in_progress", "review"]),
      supabase
        .from("artifacts")
        .select("project_id, status")
        .eq("workspace_id", workspaceId)
        .eq("status", "approved"),
      supabase
        .from("model_usage")
        .select("project_id, estimated_cost, currency")
        .eq("workspace_id", workspaceId)
        .gte("created_at", monthStart())
        .limit(5000),
    ]);

  const relationError = [
    projectsResult.error,
    modelsResult.error,
    providersResult.error,
    agentsResult.error,
    budgetsResult.error,
    tasksResult.error,
    artifactsResult.error,
    monthUsageResult.error,
  ].find(Boolean);
  if (relationError) throw new Error(`No pudimos completar la analítica: ${relationError.message}`);

  const projectsById = new Map(
    (projectsResult.data ?? []).map((row) => [String(row.id), row]),
  );
  const modelsById = new Map(
    (modelsResult.data ?? []).map((row) => [String(row.id), row]),
  );
  const providersById = new Map(
    (providersResult.data ?? []).map((row) => [String(row.id), row]),
  );
  const agentsById = new Map(
    (agentsResult.data ?? []).map((row) => [String(row.id), row]),
  );

  for (const model of modelsResult.data ?? []) {
    if (model.provider_id) providerIds.add(String(model.provider_id));
  }
  if ([...providerIds].some((id) => !providersById.has(id))) {
    const missing = [...providerIds].filter((id) => !providersById.has(id));
    const missingResult = await supabase
      .from("ai_providers")
      .select("id, display_name, color")
      .eq("workspace_id", workspaceId)
      .in("id", missing);
    for (const row of missingResult.data ?? []) providersById.set(String(row.id), row);
  }

  const feedbackByModel = new Map<string, Array<Record<string, unknown>>>();
  const feedbackByAgent = new Map<string, Array<Record<string, unknown>>>();
  const feedbackByProject = new Map<string, Array<Record<string, unknown>>>();
  const feedbackByRecommendation = new Map<string, Record<string, unknown>>();
  for (const row of feedback) {
    if (row.model_id) {
      const key = String(row.model_id);
      feedbackByModel.set(key, [...(feedbackByModel.get(key) ?? []), row]);
    }
    if (row.agent_id) {
      const key = String(row.agent_id);
      feedbackByAgent.set(key, [...(feedbackByAgent.get(key) ?? []), row]);
    }
    if (row.project_id) {
      const key = String(row.project_id);
      feedbackByProject.set(key, [...(feedbackByProject.get(key) ?? []), row]);
    }
    if (row.recommendation_event_id) {
      feedbackByRecommendation.set(String(row.recommendation_event_id), row);
    }
  }

  const usageByRun = new Map(usage.map((row) => [String(row.run_id), row]));
  const completedRuns = runs.filter((row) => row.status === "completed");
  const failedRuns = runs.filter((row) => row.status === "failed");
  const cancelledRuns = runs.filter((row) => row.status === "cancelled");
  const durations = runs
    .map((row) => numberOrNull(row.duration_ms))
    .filter((value): value is number => value !== null);
  const knownCostByCurrency: Record<string, number> = {};
  let displayCost = 0;
  let displayCostCount = 0;
  let unknownCostRuns = 0;
  for (const row of usage) {
    const cost = numberOrNull(row.estimated_cost);
    const currency = String(row.currency ?? "USD").toUpperCase();
    if (cost === null) {
      unknownCostRuns += 1;
      continue;
    }
    knownCostByCurrency[currency] = (knownCostByCurrency[currency] ?? 0) + cost;
    const converted = convertCost(cost, currency, settings);
    if (converted === null) unknownCostRuns += 1;
    else {
      displayCost += converted;
      displayCostCount += 1;
    }
  }

  const feedbackRatings = feedback.map((row) => Number(row.rating));
  const acceptedFeedback = feedback.filter((row) => row.verdict === "accepted").length;
  const savedMinutes = feedback.reduce((sum, row) => {
    const manual = numberOrNull(row.estimated_minutes_saved);
    if (manual !== null) return sum + manual;
    if (row.verdict === "accepted") return sum + settings.acceptedMinutesSaved;
    if (row.verdict === "partial") return sum + settings.partialMinutesSaved;
    return sum + settings.rejectedMinutesSaved;
  }, 0);

  const dailyMap = new Map<string, AnalyticsDashboardData["daily"][number]>();
  for (const row of runs) {
    const key = dateKey(String(row.created_at));
    const current = dailyMap.get(key) ?? {
      date: key,
      runs: 0,
      completed: 0,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
      knownCost: 0,
      displayCost: null,
    };
    current.runs += 1;
    if (row.status === "completed") current.completed += 1;
    if (row.status === "failed") current.failed += 1;
    const usageRow = usageByRun.get(String(row.id));
    if (usageRow) {
      current.inputTokens += Number(usageRow.input_tokens ?? 0);
      current.outputTokens += Number(usageRow.output_tokens ?? 0);
      const cost = numberOrNull(usageRow.estimated_cost);
      if (cost !== null) {
        current.knownCost += cost;
        const converted = convertCost(cost, String(usageRow.currency ?? "USD"), settings);
        if (converted !== null) current.displayCost = (current.displayCost ?? 0) + converted;
      }
    }
    dailyMap.set(key, current);
  }

  const runsByModel = new Map<string, Array<Record<string, unknown>>>();
  const usageByModel = new Map<string, Array<Record<string, unknown>>>();
  const recommendationsByRecommendedModel = new Map<string, number>();
  const recommendationsBySelectedModel = new Map<string, number>();
  for (const row of runs) {
    if (!row.model_id) continue;
    const key = String(row.model_id);
    runsByModel.set(key, [...(runsByModel.get(key) ?? []), row]);
  }
  for (const row of usage) {
    if (!row.model_id) continue;
    const key = String(row.model_id);
    usageByModel.set(key, [...(usageByModel.get(key) ?? []), row]);
  }
  for (const row of recommendations) {
    if (row.recommended_model_id) {
      const key = String(row.recommended_model_id);
      recommendationsByRecommendedModel.set(
        key,
        (recommendationsByRecommendedModel.get(key) ?? 0) + 1,
      );
    }
    if (row.selected_model_id) {
      const key = String(row.selected_model_id);
      recommendationsBySelectedModel.set(
        key,
        (recommendationsBySelectedModel.get(key) ?? 0) + 1,
      );
    }
  }

  const models: ModelPerformanceRow[] = [...new Set([...runsByModel.keys(), ...usageByModel.keys(), ...feedbackByModel.keys()])]
    .map((id) => {
      const model = modelsById.get(id);
      const modelRuns = runsByModel.get(id) ?? [];
      const modelUsage = usageByModel.get(id) ?? [];
      const modelFeedback = feedbackByModel.get(id) ?? [];
      const providerId = model?.provider_id ? String(model.provider_id) : "";
      const provider = providersById.get(providerId);
      const currencies = [...new Set(modelUsage.map((row) => String(row.currency ?? "USD")))];
      const currency = currencies.length === 1 ? currencies[0]! : "MIX";
      const knownCostRows = modelUsage
        .map((row) => numberOrNull(row.estimated_cost))
        .filter((value): value is number => value !== null);
      const knownCost =
        currencies.length === 1 && knownCostRows.length
          ? knownCostRows.reduce((sum, value) => sum + value, 0)
          : null;
      const convertedCosts = modelUsage
        .map((row) => convertCost(numberOrNull(row.estimated_cost), String(row.currency ?? "USD"), settings))
        .filter((value): value is number => value !== null);
      const ratings = modelFeedback.map((row) => Number(row.rating));
      const verdicts = modelFeedback.map((row) => row.verdict as FeedbackVerdict);
      const corrections = modelFeedback.map((row) => Number(row.correction_count ?? 0));
      const completed = modelRuns.filter((row) => row.status === "completed").length;
      const failed = modelRuns.filter((row) => row.status === "failed").length;
      return {
        id,
        name: String(model?.display_name ?? "Modelo eliminado"),
        providerName: String(provider?.display_name ?? "Proveedor"),
        providerColor: String(provider?.color ?? "#55e6c1"),
        runs: modelRuns.length,
        completed,
        failed,
        successRate: modelRuns.length ? rounded((completed / modelRuns.length) * 100, 1) : 0,
        inputTokens: modelUsage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
        outputTokens: modelUsage.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
        knownCost: knownCost === null ? null : rounded(knownCost, 8),
        currency,
        displayCost: convertedCosts.length ? rounded(convertedCosts.reduce((sum, value) => sum + value, 0), 4) : null,
        averageDurationMs: average(
          modelRuns
            .map((row) => numberOrNull(row.duration_ms))
            .filter((value): value is number => value !== null),
        ),
        averageRating: average(ratings),
        acceptanceRate: modelFeedback.length
          ? rounded((modelFeedback.filter((row) => row.verdict === "accepted").length / modelFeedback.length) * 100, 1)
          : null,
        correctionCount: corrections.reduce((sum, value) => sum + value, 0),
        recommendationCount: recommendationsByRecommendedModel.get(id) ?? 0,
        selectedCount: recommendationsBySelectedModel.get(id) ?? 0,
        historyScore: historyScore({ ratings, verdicts, corrections }),
      };
    })
    .sort((a, b) => b.runs - a.runs || b.historyScore - a.historyScore);

  const runsByAgent = new Map<string, Array<Record<string, unknown>>>();
  for (const row of runs) {
    if (!row.agent_id) continue;
    const key = String(row.agent_id);
    runsByAgent.set(key, [...(runsByAgent.get(key) ?? []), row]);
  }
  const handoffsByAgent = new Map<string, number>();
  for (const row of handoffs) {
    if (row.status !== "completed" || !row.target_agent_id) continue;
    const key = String(row.target_agent_id);
    handoffsByAgent.set(key, (handoffsByAgent.get(key) ?? 0) + 1);
  }
  const agents: AgentPerformanceRow[] = [...new Set([...runsByAgent.keys(), ...feedbackByAgent.keys(), ...handoffsByAgent.keys()])]
    .map((id) => {
      const agent = agentsById.get(id);
      const agentRuns = runsByAgent.get(id) ?? [];
      const agentFeedback = feedbackByAgent.get(id) ?? [];
      const completed = agentRuns.filter((row) => row.status === "completed").length;
      const failed = agentRuns.filter((row) => row.status === "failed").length;
      return {
        id,
        name: String(agent?.name ?? "Agente eliminado"),
        role: String(agent?.role ?? "custom"),
        color: String(agent?.color ?? "#55e6c1"),
        runs: agentRuns.length,
        completed,
        failed,
        successRate: agentRuns.length ? rounded((completed / agentRuns.length) * 100, 1) : 0,
        averageDurationMs: average(
          agentRuns
            .map((row) => numberOrNull(row.duration_ms))
            .filter((value): value is number => value !== null),
        ),
        averageRating: average(agentFeedback.map((row) => Number(row.rating))),
        acceptedResults: agentFeedback.filter((row) => row.verdict === "accepted").length,
        correctionCount: agentFeedback.reduce((sum, row) => sum + Number(row.correction_count ?? 0), 0),
        handoffsCompleted: handoffsByAgent.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.runs + b.handoffsCompleted - (a.runs + a.handoffsCompleted));

  const runsByProject = new Map<string, Array<Record<string, unknown>>>();
  const usageByProject = new Map<string, Array<Record<string, unknown>>>();
  for (const row of runs) {
    const key = String(row.project_id);
    runsByProject.set(key, [...(runsByProject.get(key) ?? []), row]);
  }
  for (const row of usage) {
    const key = String(row.project_id);
    usageByProject.set(key, [...(usageByProject.get(key) ?? []), row]);
  }
  const activeTasksByProject = new Map<string, number>();
  for (const row of tasksResult.data ?? []) {
    activeTasksByProject.set(
      row.project_id,
      (activeTasksByProject.get(row.project_id) ?? 0) + 1,
    );
  }
  const approvedArtifactsByProject = new Map<string, number>();
  for (const row of artifactsResult.data ?? []) {
    approvedArtifactsByProject.set(
      row.project_id,
      (approvedArtifactsByProject.get(row.project_id) ?? 0) + 1,
    );
  }
  const projects: ProjectPerformanceRow[] = [...new Set([...runsByProject.keys(), ...usageByProject.keys(), ...feedbackByProject.keys()])]
    .map((id) => {
      const project = projectsById.get(id);
      const projectRuns = runsByProject.get(id) ?? [];
      const projectUsage = usageByProject.get(id) ?? [];
      const projectFeedback = feedbackByProject.get(id) ?? [];
      const currencies = [...new Set(projectUsage.map((row) => String(row.currency ?? "USD")))];
      const converted = projectUsage
        .map((row) => convertCost(numberOrNull(row.estimated_cost), String(row.currency ?? "USD"), settings))
        .filter((value): value is number => value !== null);
      return {
        id,
        name: String(project?.name ?? "Proyecto eliminado"),
        color: String(project?.color ?? "#55e6c1"),
        runs: projectRuns.length,
        completed: projectRuns.filter((row) => row.status === "completed").length,
        inputTokens: projectUsage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
        outputTokens: projectUsage.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
        knownCost:
          currencies.length === 1 && projectUsage.some((row) => numberOrNull(row.estimated_cost) !== null)
            ? rounded(
                projectUsage.reduce(
                  (sum, row) => sum + (numberOrNull(row.estimated_cost) ?? 0),
                  0,
                ),
                8,
              )
            : null,
        currency: currencies.length === 1 ? currencies[0]! : "MIX",
        displayCost: converted.length ? rounded(converted.reduce((sum, value) => sum + value, 0), 4) : null,
        averageRating: average(projectFeedback.map((row) => Number(row.rating))),
        activeTasks: activeTasksByProject.get(id) ?? 0,
        approvedArtifacts: approvedArtifactsByProject.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.runs - a.runs);

  const runsByProvider = new Map<string, Array<Record<string, unknown>>>();
  const usageByProvider = new Map<string, Array<Record<string, unknown>>>();
  for (const row of runs) {
    if (!row.provider_id) continue;
    const key = String(row.provider_id);
    runsByProvider.set(key, [...(runsByProvider.get(key) ?? []), row]);
  }
  for (const row of usage) {
    if (!row.provider_id) continue;
    const key = String(row.provider_id);
    usageByProvider.set(key, [...(usageByProvider.get(key) ?? []), row]);
  }
  const providers: ProviderPerformanceRow[] = [...new Set([...runsByProvider.keys(), ...usageByProvider.keys()])]
    .map((id) => {
      const provider = providersById.get(id);
      const providerRuns = runsByProvider.get(id) ?? [];
      const providerUsage = usageByProvider.get(id) ?? [];
      const currencies = [...new Set(providerUsage.map((row) => String(row.currency ?? "USD")))];
      const converted = providerUsage
        .map((row) => convertCost(numberOrNull(row.estimated_cost), String(row.currency ?? "USD"), settings))
        .filter((value): value is number => value !== null);
      return {
        id,
        name: String(provider?.display_name ?? "Proveedor eliminado"),
        color: String(provider?.color ?? "#55e6c1"),
        runs: providerRuns.length,
        completed: providerRuns.filter((row) => row.status === "completed").length,
        failed: providerRuns.filter((row) => row.status === "failed").length,
        inputTokens: providerUsage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
        outputTokens: providerUsage.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
        knownCost:
          currencies.length === 1 && providerUsage.some((row) => numberOrNull(row.estimated_cost) !== null)
            ? rounded(
                providerUsage.reduce(
                  (sum, row) => sum + (numberOrNull(row.estimated_cost) ?? 0),
                  0,
                ),
                8,
              )
            : null,
        currency: currencies.length === 1 ? currencies[0]! : "MIX",
        displayCost: converted.length ? rounded(converted.reduce((sum, value) => sum + value, 0), 4) : null,
        averageDurationMs: average(
          providerRuns
            .map((row) => numberOrNull(row.duration_ms))
            .filter((value): value is number => value !== null),
        ),
      };
    })
    .sort((a, b) => b.runs - a.runs);

  const monthUsage = (monthUsageResult.data ?? []) as Array<{
    project_id: string;
    estimated_cost: number | string | null;
    currency: string;
  }>;
  const budgets: BudgetStatus[] = (budgetsResult.data ?? []).map((row) => {
    const project = row.project_id ? projectsById.get(String(row.project_id)) : null;
    const relevant = monthUsage.filter(
      (usageRow) => !row.project_id || usageRow.project_id === row.project_id,
    );
    const converted = relevant
      .map((usageRow) => {
        const amount = numberOrNull(usageRow.estimated_cost);
        const sourceCurrency = String(usageRow.currency ?? "USD");
        if (String(row.currency).toUpperCase() === settings.displayCurrency.toUpperCase()) {
          return convertCost(amount, sourceCurrency, settings);
        }
        if (sourceCurrency.toUpperCase() === String(row.currency).toUpperCase()) return amount;
        if (String(row.currency).toUpperCase() === "USD" && sourceCurrency.toUpperCase() === "MXN" && settings.usdToDisplayRate) {
          return amount === null ? null : amount / settings.usdToDisplayRate;
        }
        return null;
      })
      .filter((value): value is number => value !== null);
    const currentSpend = converted.length
      ? converted.reduce((sum, value) => sum + value, 0)
      : relevant.length
        ? null
        : 0;
    const limit = Number(row.limit_amount);
    const percentage = currentSpend === null ? null : rounded((currentSpend / limit) * 100, 1);
    const state: BudgetStatus["state"] =
      percentage === null
        ? "unknown"
        : percentage >= 100
          ? "exceeded"
          : percentage >= Number(row.warning_threshold)
            ? "warning"
            : "ok";
    return {
      id: row.id,
      projectId: row.project_id,
      label: project ? String(project.name) : "Presupuesto global",
      limitAmount: limit,
      currency: String(row.currency),
      warningThreshold: Number(row.warning_threshold),
      currentSpend: currentSpend === null ? null : rounded(currentSpend, 4),
      percentage,
      state,
    };
  });

  const recommendationHistory: RecommendationHistoryRow[] = recommendations.slice(0, 50).map((row) => {
    const feedbackRow = feedbackByRecommendation.get(String(row.id));
    const project = row.project_id ? projectsById.get(String(row.project_id)) : null;
    const recommendedModel = row.recommended_model_id
      ? modelsById.get(String(row.recommended_model_id))
      : null;
    const selectedModel = row.selected_model_id
      ? modelsById.get(String(row.selected_model_id))
      : null;
    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      source: row.source === "manual" ? "manual" : "runtime",
      taskType: String(row.task_type),
      projectName: project ? String(project.name) : null,
      recommendedModel: recommendedModel ? String(recommendedModel.display_name) : null,
      selectedModel: selectedModel ? String(selectedModel.display_name) : null,
      score: numberOrNull(row.recommendation_score),
      confidence: numberOrNull(row.confidence),
      wasOverridden: Boolean(row.was_overridden),
      verdict: feedbackRow ? (feedbackRow.verdict as FeedbackVerdict) : null,
      rating: feedbackRow ? Number(feedbackRow.rating) : null,
    };
  });

  return {
    settings,
    summary: {
      runCount: runs.length,
      completedRuns: completedRuns.length,
      failedRuns: failedRuns.length,
      cancelledRuns: cancelledRuns.length,
      successRate: runs.length ? rounded((completedRuns.length / runs.length) * 100, 1) : 0,
      inputTokens: usage.reduce((sum, row) => sum + Number(row.input_tokens ?? 0), 0),
      outputTokens: usage.reduce((sum, row) => sum + Number(row.output_tokens ?? 0), 0),
      totalTokens: usage.reduce((sum, row) => sum + Number(row.total_tokens ?? 0), 0),
      knownCostByCurrency: Object.fromEntries(
        Object.entries(knownCostByCurrency).map(([currency, amount]) => [currency, rounded(amount, 8)]),
      ),
      displayCost: displayCostCount ? rounded(displayCost, 4) : null,
      unknownCostRuns,
      averageDurationMs: average(durations),
      p95DurationMs: percentile(durations, 95),
      handoffCount: handoffs.length,
      completedHandoffs: handoffs.filter((row) => row.status === "completed").length,
      failedHandoffs: handoffs.filter((row) => row.status === "failed").length,
      teamExecutionCount: teamExecutions.length,
      completedTeamExecutions: teamExecutions.filter((row) => row.status === "completed").length,
      partialTeamExecutions: teamExecutions.filter((row) => row.status === "partial").length,
      failedTeamExecutions: teamExecutions.filter((row) => row.status === "failed").length,
      cancelledTeamExecutions: teamExecutions.filter((row) => row.status === "cancelled").length,
      feedbackCount: feedback.length,
      averageRating: average(feedbackRatings),
      acceptanceRate: feedback.length ? rounded((acceptedFeedback / feedback.length) * 100, 1) : null,
      correctionCount: feedback.reduce((sum, row) => sum + Number(row.correction_count ?? 0), 0),
      estimatedMinutesSaved: savedMinutes,
      recommendationCount: recommendations.length,
      overrideRate: recommendations.length
        ? rounded((recommendations.filter((row) => row.was_overridden).length / recommendations.length) * 100, 1)
        : null,
    },
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    models,
    agents,
    projects,
    providers,
    budgets,
    recommendationHistory,
  };
}

export function analyticsToCsv(data: AnalyticsDashboardData): string {
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows: Array<Array<unknown>> = [
    ["section", "name", "runs", "completed", "failed", "input_tokens", "output_tokens", "cost", "currency", "rating", "success_rate"],
  ];
  for (const model of data.models) {
    rows.push([
      "model",
      `${model.providerName} - ${model.name}`,
      model.runs,
      model.completed,
      model.failed,
      model.inputTokens,
      model.outputTokens,
      model.knownCost,
      model.currency,
      model.averageRating ?? "",
      model.successRate,
    ]);
  }
  for (const agent of data.agents) {
    rows.push([
      "agent",
      agent.name,
      agent.runs,
      agent.completed,
      agent.failed,
      "",
      "",
      "",
      "",
      agent.averageRating ?? "",
      agent.successRate,
    ]);
  }
  for (const project of data.projects) {
    rows.push([
      "project",
      project.name,
      project.runs,
      project.completed,
      "",
      project.inputTokens,
      project.outputTokens,
      project.knownCost,
      project.currency,
      project.averageRating ?? "",
      project.runs ? rounded((project.completed / project.runs) * 100, 1) : 0,
    ]);
  }
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}
