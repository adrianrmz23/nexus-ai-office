export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const FEEDBACK_VERDICTS = ["accepted", "partial", "rejected"] as const;
export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

export const FEEDBACK_VERDICT_LABELS: Record<FeedbackVerdict, string> = {
  accepted: "Aceptada",
  partial: "Parcialmente útil",
  rejected: "Rechazada",
};

export type AnalyticsSettings = {
  displayCurrency: string;
  usdToDisplayRate: number | null;
  acceptedMinutesSaved: number;
  partialMinutesSaved: number;
  rejectedMinutesSaved: number;
};

export type AnalyticsFilters = {
  range: AnalyticsRange;
  projectId: string | null;
};

export type AnalyticsSummary = {
  runCount: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  successRate: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  knownCostByCurrency: Record<string, number>;
  displayCost: number | null;
  unknownCostRuns: number;
  averageDurationMs: number | null;
  p95DurationMs: number | null;
  handoffCount: number;
  completedHandoffs: number;
  failedHandoffs: number;
  teamExecutionCount: number;
  completedTeamExecutions: number;
  partialTeamExecutions: number;
  failedTeamExecutions: number;
  cancelledTeamExecutions: number;
  feedbackCount: number;
  averageRating: number | null;
  acceptanceRate: number | null;
  correctionCount: number;
  estimatedMinutesSaved: number;
  recommendationCount: number;
  overrideRate: number | null;
};

export type AnalyticsDailyPoint = {
  date: string;
  runs: number;
  completed: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  knownCost: number;
  displayCost: number | null;
};

export type ModelPerformanceRow = {
  id: string;
  name: string;
  providerName: string;
  providerColor: string;
  runs: number;
  completed: number;
  failed: number;
  successRate: number;
  inputTokens: number;
  outputTokens: number;
  knownCost: number | null;
  currency: string;
  displayCost: number | null;
  averageDurationMs: number | null;
  averageRating: number | null;
  acceptanceRate: number | null;
  correctionCount: number;
  recommendationCount: number;
  selectedCount: number;
  historyScore: number;
};

export type AgentPerformanceRow = {
  id: string;
  name: string;
  role: string;
  color: string;
  runs: number;
  completed: number;
  failed: number;
  successRate: number;
  averageDurationMs: number | null;
  averageRating: number | null;
  acceptedResults: number;
  correctionCount: number;
  handoffsCompleted: number;
};

export type ProjectPerformanceRow = {
  id: string;
  name: string;
  color: string;
  runs: number;
  completed: number;
  inputTokens: number;
  outputTokens: number;
  knownCost: number | null;
  currency: string;
  displayCost: number | null;
  averageRating: number | null;
  activeTasks: number;
  approvedArtifacts: number;
};

export type ProviderPerformanceRow = {
  id: string;
  name: string;
  color: string;
  runs: number;
  completed: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  knownCost: number | null;
  currency: string;
  displayCost: number | null;
  averageDurationMs: number | null;
};

export type BudgetStatus = {
  id: string;
  projectId: string | null;
  label: string;
  limitAmount: number;
  currency: string;
  warningThreshold: number;
  currentSpend: number | null;
  percentage: number | null;
  state: "ok" | "warning" | "exceeded" | "unknown";
};

export type RecommendationHistoryRow = {
  id: string;
  createdAt: string;
  source: "runtime" | "manual";
  taskType: string;
  projectName: string | null;
  recommendedModel: string | null;
  selectedModel: string | null;
  score: number | null;
  confidence: number | null;
  wasOverridden: boolean;
  verdict: FeedbackVerdict | null;
  rating: number | null;
};

export type AnalyticsDashboardData = {
  settings: AnalyticsSettings;
  summary: AnalyticsSummary;
  daily: AnalyticsDailyPoint[];
  models: ModelPerformanceRow[];
  agents: AgentPerformanceRow[];
  projects: ProjectPerformanceRow[];
  providers: ProviderPerformanceRow[];
  budgets: BudgetStatus[];
  recommendationHistory: RecommendationHistoryRow[];
};

export type MessageFeedbackRecord = {
  id: string;
  verdict: FeedbackVerdict;
  rating: number;
  correctionCount: number;
  notes: string;
  estimatedMinutesSaved: number | null;
};
