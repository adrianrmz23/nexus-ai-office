import type { AgentRole } from "@/modules/agents/domain/agent";

export const ARTIFACT_TYPES = [
  "code",
  "component",
  "page",
  "sql",
  "migration",
  "adr",
  "plan",
  "documentation",
  "report",
  "checklist",
  "test_case",
  "prompt",
  "other",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
  "archived",
] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  code: "Código",
  component: "Componente",
  page: "Página",
  sql: "Consulta SQL",
  migration: "Migración",
  adr: "ADR",
  plan: "Plan",
  documentation: "Documentación",
  report: "Reporte",
  checklist: "Checklist",
  test_case: "Caso de prueba",
  prompt: "Prompt",
  other: "Otro",
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
  rejected: "Rechazado",
  archived: "Archivado",
};

export type ArtifactAgent = {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  color: string;
};

export type ArtifactVersionRecord = {
  id: string;
  artifact_id: string;
  version_number: number;
  content: string;
  change_summary: string;
  content_checksum: string;
  source_message_id: string | null;
  created_by_agent_id: string | null;
  created_at: string;
  createdByAgent?: ArtifactAgent | null;
};

export type ArtifactRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  task_id: string | null;
  created_by_agent_id: string | null;
  reviewer_agent_id: string | null;
  title: string;
  artifact_type: ArtifactType;
  language: string | null;
  file_path: string | null;
  status: ArtifactStatus;
  current_version_number: number;
  review_note: string;
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string; color: string };
  task?: { id: string; title: string; status: string } | null;
  createdByAgent?: ArtifactAgent | null;
  reviewerAgent?: ArtifactAgent | null;
  currentVersion?: ArtifactVersionRecord | null;
};
