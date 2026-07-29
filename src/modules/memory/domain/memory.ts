export const MEMORY_SCOPES = ["global", "project", "agent", "conversation"] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const MEMORY_TYPES = [
  "preference",
  "decision",
  "fact",
  "error_solution",
  "instruction",
  "summary",
  "custom",
] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const MEMORY_STATUSES = ["active", "inactive", "archived"] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export const DOCUMENT_STATUSES = [
  "processing",
  "ready",
  "stored_unindexed",
  "failed",
  "archived",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const MEMORY_SCOPE_LABELS: Record<MemoryScope, string> = {
  global: "Global",
  project: "Proyecto",
  agent: "Agente",
  conversation: "Conversación",
};

export const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  preference: "Preferencia",
  decision: "Decisión",
  fact: "Dato",
  error_solution: "Error y solución",
  instruction: "Instrucción",
  summary: "Resumen",
  custom: "Personalizada",
};

export const MEMORY_STATUS_LABELS: Record<MemoryStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  archived: "Archivada",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  processing: "Procesando",
  ready: "Indexado",
  stored_unindexed: "Guardado sin indexar",
  failed: "Falló",
  archived: "Archivado",
};

export type MemoryDocumentRecord = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  scope_type: MemoryScope;
  title: string;
  source_type: string;
  file_name: string | null;
  mime_type: string | null;
  file_extension: string | null;
  size_bytes: number;
  language: string | null;
  status: DocumentStatus;
  extraction_status: string;
  embedding_status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  project?: { id: string; name: string; color: string } | null;
};

export type MemoryRecord = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  scope_type: MemoryScope;
  memory_type: MemoryType;
  title: string;
  content: string;
  importance: number;
  status: MemoryStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  project?: { id: string; name: string; color: string } | null;
};

export type RetrievedMemorySource = {
  sourceType: "document_chunk" | "memory";
  sourceId: string;
  title: string;
  content: string;
  score: number;
  documentId: string | null;
  metadata: Record<string, unknown>;
};

export type MemoryRetrievalResult = {
  mode: "semantic" | "text" | "hybrid" | "none";
  sources: RetrievedMemorySource[];
  latencyMs: number;
  embeddingModelId: string | null;
  embeddingProviderId: string | null;
};
