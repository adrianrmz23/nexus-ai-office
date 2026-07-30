export const REPOSITORY_STATUSES = [
  "processing",
  "active",
  "failed",
  "archived",
] as const;
export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];

export const REPOSITORY_STATUS_LABELS: Record<RepositoryStatus, string> = {
  processing: "Procesando",
  active: "Activo",
  failed: "Con error",
  archived: "Archivado",
};

export const FILE_PROPOSAL_STATUSES = [
  "proposed",
  "changes_requested",
  "approved",
  "rejected",
  "archived",
] as const;
export type FileProposalStatus = (typeof FILE_PROPOSAL_STATUSES)[number];

export const FILE_PROPOSAL_STATUS_LABELS: Record<FileProposalStatus, string> = {
  proposed: "Propuesta",
  changes_requested: "Cambios solicitados",
  approved: "Aprobada",
  rejected: "Rechazada",
  archived: "Archivada",
};

export type RepositoryProjectOption = {
  id: string;
  name: string;
  color: string;
};

export type RepositoryRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  source_type: "zip" | "manual" | "github_reference";
  repository_url: string | null;
  default_branch: string;
  status: RepositoryStatus;
  file_count: number;
  indexed_file_count: number;
  total_bytes: number;
  source_checksum: string | null;
  import_summary: Record<string, unknown>;
  error_message: string | null;
  last_import_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  project?: RepositoryProjectOption;
};

export type ProjectFileRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  repository_id: string;
  path: string;
  directory_path: string;
  file_name: string;
  extension: string | null;
  mime_type: string;
  language: string | null;
  size_bytes: number;
  checksum: string;
  content_text: string | null;
  is_binary: boolean;
  is_indexed: boolean;
  status: "active" | "deleted" | "archived";
  current_version_number: number;
  created_at: string;
  updated_at: string;
};

export type ProjectFileVersionRecord = {
  id: string;
  file_id: string;
  version_number: number;
  content_text: string;
  checksum: string;
  size_bytes: number;
  source_type: "import" | "proposal" | "manual";
  change_summary: string;
  proposal_id: string | null;
  created_by_agent_id: string | null;
  created_at: string;
};

export type FileChangeProposalRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  repository_id: string;
  file_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  proposed_by_agent_id: string | null;
  title: string;
  summary: string;
  proposed_content: string;
  proposed_checksum: string;
  base_version_number: number;
  status: FileProposalStatus;
  review_note: string;
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationProjectFileOption = {
  id: string;
  repositoryId: string;
  repositoryName: string;
  path: string;
  language: string | null;
  sizeBytes: number;
  versionNumber: number;
  selected: boolean;
};

export type RepositoryImportSummary = {
  imported: number;
  updated: number;
  unchanged: number;
  deleted: number;
  skipped: number;
  skippedReasons: Array<{ path: string; reason: string }>;
  rootPrefix: string | null;
};
