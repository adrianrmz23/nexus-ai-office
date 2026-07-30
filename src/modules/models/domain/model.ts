import {
  BrainCircuit,
  Cpu,
  Gem,
  MoonStar,
  Route,
  Server,
  Sparkles,
  Waves,
  type LucideIcon,
} from "lucide-react";

import type { AIProviderType } from "@/core/ai/contracts";

export const PROVIDER_STATUSES = ["active", "inactive", "archived"] as const;
export const MODEL_STATUSES = ["active", "inactive", "archived"] as const;
export const MODEL_KINDS = [
  "chat",
  "reasoning",
  "embedding",
  "image",
  "audio",
  "multimodal",
  "other",
] as const;
export const MODEL_TASK_TYPES = [
  "general",
  "coding",
  "debugging",
  "sql",
  "design",
  "architecture",
  "qa",
  "analysis",
  "content",
] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
export type ModelStatus = (typeof MODEL_STATUSES)[number];
export type ModelKind = (typeof MODEL_KINDS)[number];
export type ModelTaskType = (typeof MODEL_TASK_TYPES)[number];

export const PROVIDER_TYPE_LABELS: Record<AIProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  kimi: "Kimi · Moonshot AI",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  openai_compatible: "Compatible con OpenAI",
};
export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};
export const MODEL_STATUS_LABELS: Record<ModelStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};
export const MODEL_KIND_LABELS: Record<ModelKind, string> = {
  chat: "Chat",
  reasoning: "Razonamiento",
  embedding: "Embeddings",
  image: "Imagen",
  audio: "Audio",
  multimodal: "Multimodal",
  other: "Otro",
};
export const MODEL_TASK_LABELS: Record<ModelTaskType, string> = {
  general: "Uso general",
  coding: "Programación",
  debugging: "Debugging",
  sql: "SQL y datos",
  design: "Diseño UI/UX",
  architecture: "Arquitectura",
  qa: "QA y pruebas",
  analysis: "Análisis complejo",
  content: "Contenido",
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  brain: BrainCircuit,
  gem: Gem,
  moon: MoonStar,
  waves: Waves,
  route: Route,
  server: Server,
  cpu: Cpu,
};
export function getProviderIcon(icon: string): LucideIcon {
  return PROVIDER_ICONS[icon] ?? Cpu;
}

export type AIProviderRecord = {
  id: string;
  workspace_id: string;
  slug: string;
  display_name: string;
  provider_type: AIProviderType;
  base_url: string;
  icon: string;
  color: string;
  status: ProviderStatus;
  credential_status: "missing" | "configured";
  credential_last_four: string | null;
  health_status: "unchecked" | "healthy" | "error";
  last_checked_at: string | null;
  last_error: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ModelCapabilitiesRecord = {
  model_id: string;
  workspace_id: string;
  supports_reasoning: boolean | null;
  supports_tools: boolean | null;
  supports_streaming: boolean | null;
  supports_vision: boolean | null;
  supports_files: boolean | null;
  supports_structured_output: boolean | null;
  supports_embeddings: boolean | null;
  reasoning_score: number | null;
  coding_score: number | null;
  design_score: number | null;
  vision_score: number | null;
  sql_score: number | null;
  long_context_score: number | null;
  speed_score: number | null;
};

export type AIModelRecord = {
  id: string;
  workspace_id: string;
  provider_id: string;
  display_name: string;
  api_identifier: string;
  model_kind: ModelKind;
  status: ModelStatus;
  context_window: number | null;
  max_output_tokens: number | null;
  input_cost_per_million: number | null;
  output_cost_per_million: number | null;
  currency: string;
  pricing_notes: string;
  last_reviewed_at: string | null;
  last_synced_at: string | null;
  source_metadata: Record<string, unknown>;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  provider?: Pick<
    AIProviderRecord,
    "id" | "display_name" | "provider_type" | "color" | "status" | "health_status"
  >;
  capabilities?: ModelCapabilitiesRecord | null;
  taskScores?: Partial<Record<ModelTaskType, number>>;
  technologyScores?: Record<string, number>;
  historyScore?: number;
  historySamples?: number;
};

export type ModelPreferenceRecord = {
  preferred_model_id: string | null;
  selection_mode?: "automatic" | "fixed";
  alternative_model_ids?: string[];
  budget_profile?: "economy" | "balanced" | "quality";
  speed_preference?: "fast" | "balanced" | "quality";
};
