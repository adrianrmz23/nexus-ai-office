import type { AIModelRecord, ModelTaskType } from "@/modules/models/domain/model";

export type RecommendationInput = {
  taskType: ModelTaskType;
  technologyIds: string[];
  requiresReasoning: boolean;
  requiresVision: boolean;
  requiresTools: boolean;
  requiresFiles: boolean;
  estimatedContextTokens: number;
  budgetProfile: "economy" | "balanced" | "quality";
  speedPreference: "fast" | "balanced" | "quality";
  preferredModelId?: string | null;
};
export type RecommendationWeights = {
  task: number;
  technology: number;
  reasoning: number;
  context: number;
  capability: number;
  history: number;
  cost: number;
  speed: number;
  preference: number;
};
export type ModelRecommendation = {
  model: AIModelRecord;
  score: number;
  confidence: number;
  reasons: string[];
};
const DEFAULT_WEIGHTS: RecommendationWeights = {
  task: 30,
  technology: 20,
  reasoning: 12,
  context: 10,
  capability: 8,
  history: 8,
  cost: 5,
  speed: 4,
  preference: 3,
};
function neutral(value: number | null | undefined): number {
  return value ?? 50;
}
function requiredCapability(value: boolean | null | undefined, required: boolean): number {
  if (!required) return 100;
  if (value === true) return 100;
  if (value === false) return 0;
  return 45;
}
function costScore(model: AIModelRecord, profile: RecommendationInput["budgetProfile"]): number {
  const prices = [model.input_cost_per_million, model.output_cost_per_million].filter(
    (value): value is number => value !== null,
  );
  if (prices.length === 0) return 50;
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  if (profile === "quality") return Math.max(45, 100 - average / 2);
  if (profile === "balanced") return Math.max(20, 100 - average * 2);
  return Math.max(0, 100 - average * 5);
}

export function recommendModels(
  models: AIModelRecord[],
  input: RecommendationInput,
  weights: RecommendationWeights = DEFAULT_WEIGHTS,
): ModelRecommendation[] {
  return models
    .filter((model) => {
      if (model.status !== "active" || model.provider?.status !== "active") return false;
      const caps = model.capabilities;
      if (input.requiresReasoning && caps?.supports_reasoning === false) return false;
      if (input.requiresVision && caps?.supports_vision === false) return false;
      if (input.requiresTools && caps?.supports_tools === false) return false;
      if (input.requiresFiles && caps?.supports_files === false) return false;
      if (
        input.estimatedContextTokens > 0 &&
        model.context_window !== null &&
        model.context_window < input.estimatedContextTokens
      ) return false;
      return true;
    })
    .map((model) => {
      const caps = model.capabilities;
      const task = neutral(model.taskScores?.[input.taskType]);
      const techValues = input.technologyIds
        .map((id) => model.technologyScores?.[id])
        .filter((value): value is number => typeof value === "number");
      const technology = techValues.length
        ? techValues.reduce((sum, value) => sum + value, 0) / techValues.length
        : 50;
      const reasoning = input.requiresReasoning ? neutral(caps?.reasoning_score) : 75;
      const context = input.estimatedContextTokens <= 0
        ? 75
        : model.context_window === null
          ? 45
          : Math.min(100, (model.context_window / input.estimatedContextTokens) * 100);
      const capability = [
        requiredCapability(caps?.supports_vision, input.requiresVision),
        requiredCapability(caps?.supports_tools, input.requiresTools),
        requiredCapability(caps?.supports_files, input.requiresFiles),
      ].reduce((sum, value) => sum + value, 0) / 3;
      const history = 50;
      const cost = costScore(model, input.budgetProfile);
      const speedBase = neutral(caps?.speed_score);
      const speed = input.speedPreference === "fast" ? speedBase : (speedBase + 60) / 2;
      const preference = model.id === input.preferredModelId ? 100 : 50;
      const weighted =
        task * weights.task +
        technology * weights.technology +
        reasoning * weights.reasoning +
        context * weights.context +
        capability * weights.capability +
        history * weights.history +
        cost * weights.cost +
        speed * weights.speed +
        preference * weights.preference;
      const score = Math.round((weighted / 100) * 10) / 10;
      const known = [
        model.taskScores?.[input.taskType],
        caps?.reasoning_score,
        caps?.speed_score,
        model.context_window,
        model.input_cost_per_million,
        model.output_cost_per_million,
      ].filter((value) => value !== null && value !== undefined).length;
      const reasons: string[] = [];
      if (task >= 75) reasons.push(`Alta puntuación para la tarea: ${Math.round(task)}/100.`);
      if (technology >= 70) reasons.push("Buena afinidad con el stack seleccionado.");
      if (input.requiresReasoning && reasoning >= 70) reasons.push("Capacidad de razonamiento adecuada.");
      if (context >= 90 && input.estimatedContextTokens > 0) reasons.push("El contexto estimado cabe con margen.");
      if (input.requiresVision && caps?.supports_vision === true) reasons.push("Admite análisis visual.");
      if (input.requiresTools && caps?.supports_tools === true) reasons.push("Admite herramientas.");
      if (!reasons.length) reasons.push("Resultado equilibrado con los datos disponibles; conviene revisar sus puntuaciones.");
      return {
        model,
        score,
        confidence: Math.min(96, 45 + known * 8 + techValues.length * 4),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}
