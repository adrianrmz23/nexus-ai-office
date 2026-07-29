import type { AgentRole } from "@/modules/agents/domain/agent";
import type { ModelTaskType } from "@/modules/models/domain/model";

export const CONVERSATION_MODES = ["individual", "team"] as const;
export type ConversationMode = (typeof CONVERSATION_MODES)[number];

export const CONVERSATION_STATUSES = ["active", "archived"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_ROLES = ["user", "assistant", "system", "tool"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const MESSAGE_STATUSES = [
  "queued",
  "streaming",
  "completed",
  "failed",
  "cancelled",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const CONVERSATION_MODE_LABELS: Record<ConversationMode, string> = {
  individual: "Agente individual",
  team: "Equipo coordinado",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  queued: "En cola",
  streaming: "Generando",
  completed: "Completado",
  failed: "Falló",
  cancelled: "Cancelado",
};

export type ConversationProject = {
  id: string;
  name: string;
  color: string;
  status: string;
};

export type ConversationAgent = {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  color: string;
  instructions: string;
  creativity: number;
};

export type ConversationModel = {
  id: string;
  displayName: string;
  apiIdentifier: string;
  modelKind: string;
  providerId: string;
  providerName: string;
  providerType: string;
  providerColor: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
};

export type ConversationRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  mode: ConversationMode;
  status: ConversationStatus;
  selected_agent_id: string | null;
  preferred_model_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  project?: ConversationProject;
  selectedAgent?: Omit<ConversationAgent, "instructions" | "creativity"> | null;
  preferredModel?: Pick<
    ConversationModel,
    "id" | "displayName" | "apiIdentifier" | "providerName" | "providerColor"
  > | null;
  messageCount?: number;
  lastMessagePreview?: string | null;
};

export type MessageAttachmentRecord = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  language: string | null;
};

export type ConversationMessageRecord = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  status: MessageStatus;
  agent_id: string | null;
  model_id: string | null;
  content: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  agent?: Pick<ConversationAgent, "id" | "name" | "role" | "icon" | "color"> | null;
  model?: {
    id: string;
    displayName: string;
    providerName: string;
  } | null;
  attachments: MessageAttachmentRecord[];
};

export type ChatAttachmentInput = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  language: string | null;
  content: string;
};

export type ChatRequestInput = {
  content: string;
  mode: ConversationMode;
  agentId: string | null;
  modelId: string | null;
  taskType: ModelTaskType;
  attachments: ChatAttachmentInput[];
};

export type ChatStreamEvent =
  | {
      type: "meta";
      assistantMessageId: string;
      runId: string;
      model: {
        id: string;
        name: string;
        provider: string;
      };
      agent: {
        id: string;
        name: string;
      };
    }
  | { type: "delta"; text: string }
  | {
      type: "usage";
      inputTokens: number | null;
      outputTokens: number | null;
      estimatedCost: number | null;
      currency: string;
    }
  | {
      type: "completed";
      finishReason: string | null;
      durationMs: number;
    }
  | { type: "error"; message: string; code: string | null };
