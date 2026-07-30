import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  ConversationProjectFileOption,
  FileChangeProposalRecord,
  ProjectFileRecord,
  ProjectFileVersionRecord,
  RepositoryProjectOption,
  RepositoryRecord,
} from "@/modules/repositories/domain/repository";

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadRepositoryProjects(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<RepositoryProjectOption[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name");
  if (error) throw new Error(`No pudimos consultar los proyectos: ${error.message}`);
  return (data ?? []) as RepositoryProjectOption[];
}

export async function loadRepositories(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters?: { projectId?: string; query?: string; includeArchived?: boolean },
): Promise<RepositoryRecord[]> {
  let query = supabase
    .from("project_repositories")
    .select(
      "id, workspace_id, project_id, name, source_type, repository_url, default_branch, status, file_count, indexed_file_count, total_bytes, source_checksum, import_summary, error_message, last_import_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (!filters?.includeArchived) query = query.neq("status", "archived");
  if (filters?.query?.trim()) {
    const safe = filters.query.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _.-]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,repository_url.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`No pudimos consultar los repositorios: ${error.message}`);
  const rows = (data ?? []) as RepositoryRecord[];
  const projectIds = [...new Set(rows.map((row) => row.project_id))];
  const projectResult = projectIds.length
    ? await supabase
        .from("projects")
        .select("id, name, color")
        .eq("workspace_id", workspaceId)
        .in("id", projectIds)
    : { data: [], error: null };
  if (projectResult.error) {
    throw new Error(`No pudimos completar los proyectos: ${projectResult.error.message}`);
  }
  const projects = new Map(
    ((projectResult.data ?? []) as RepositoryProjectOption[]).map((project) => [project.id, project]),
  );
  return rows.map((row) => ({ ...row, project: projects.get(row.project_id) }));
}

export async function loadRepositoryById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  repositoryId: string,
): Promise<{ repository: RepositoryRecord; files: ProjectFileRecord[] } | null> {
  const { data: repository, error } = await supabase
    .from("project_repositories")
    .select(
      "id, workspace_id, project_id, name, source_type, repository_url, default_branch, status, file_count, indexed_file_count, total_bytes, source_checksum, import_summary, error_message, last_import_at, archived_at, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", repositoryId)
    .maybeSingle();
  if (error) throw new Error(`No pudimos consultar el repositorio: ${error.message}`);
  if (!repository) return null;

  const [projectResult, filesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("workspace_id", workspaceId)
      .eq("id", repository.project_id)
      .maybeSingle(),
    supabase
      .from("project_files")
      .select(
        "id, workspace_id, project_id, repository_id, path, directory_path, file_name, extension, mime_type, language, size_bytes, checksum, content_text, is_binary, is_indexed, status, current_version_number, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("repository_id", repositoryId)
      .order("path")
      .limit(1000),
  ]);
  if (projectResult.error || filesResult.error) {
    throw new Error(
      projectResult.error?.message ?? filesResult.error?.message ?? "No pudimos completar el repositorio.",
    );
  }

  return {
    repository: {
      ...(repository as RepositoryRecord),
      project: (projectResult.data ?? undefined) as RepositoryProjectOption | undefined,
    },
    files: (filesResult.data ?? []) as ProjectFileRecord[],
  };
}

export async function loadProjectFileById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  repositoryId: string,
  fileId: string,
): Promise<{
  repository: RepositoryRecord;
  file: ProjectFileRecord;
  versions: ProjectFileVersionRecord[];
  proposals: FileChangeProposalRecord[];
} | null> {
  const repositoryResult = await loadRepositoryById(supabase, workspaceId, repositoryId);
  if (!repositoryResult) return null;
  const file = repositoryResult.files.find((item) => item.id === fileId);
  if (!file) return null;

  const [versionsResult, proposalsResult] = await Promise.all([
    supabase
      .from("project_file_versions")
      .select(
        "id, file_id, version_number, content_text, checksum, size_bytes, source_type, change_summary, proposal_id, created_by_agent_id, created_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("file_id", fileId)
      .order("version_number", { ascending: false }),
    supabase
      .from("file_change_proposals")
      .select(
        "id, workspace_id, project_id, repository_id, file_id, conversation_id, source_message_id, proposed_by_agent_id, title, summary, proposed_content, proposed_checksum, base_version_number, status, review_note, approved_at, archived_at, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("file_id", fileId)
      .order("updated_at", { ascending: false }),
  ]);
  if (versionsResult.error || proposalsResult.error) {
    throw new Error(
      versionsResult.error?.message ?? proposalsResult.error?.message ?? "No pudimos completar el archivo.",
    );
  }

  return {
    repository: repositoryResult.repository,
    file,
    versions: (versionsResult.data ?? []) as ProjectFileVersionRecord[],
    proposals: (proposalsResult.data ?? []) as FileChangeProposalRecord[],
  };
}

export async function loadConversationFileOptions(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  projectId: string,
  conversationId: string,
): Promise<ConversationProjectFileOption[]> {
  const [filesResult, contextResult, repositoriesResult] = await Promise.all([
    supabase
      .from("project_files")
      .select("id, repository_id, path, language, size_bytes, current_version_number")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .eq("status", "active")
      .eq("is_indexed", true)
      .order("path")
      .limit(500),
    supabase
      .from("conversation_file_contexts")
      .select("project_file_id, version_number")
      .eq("workspace_id", workspaceId)
      .eq("conversation_id", conversationId),
    supabase
      .from("project_repositories")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .eq("status", "active"),
  ]);
  if (filesResult.error || contextResult.error || repositoriesResult.error) {
    throw new Error(
      filesResult.error?.message ??
        contextResult.error?.message ??
        repositoriesResult.error?.message ??
        "No pudimos consultar los archivos del proyecto.",
    );
  }
  const contextRows = (contextResult.data ?? []) as unknown as Array<{
    project_file_id: string;
    version_number: number;
  }>;
  const repositoryRows = (repositoriesResult.data ?? []) as unknown as Array<{
    id: string;
    name: string;
  }>;
  const selectedVersions = new Map<string, number>(
    contextRows.map((row) => [row.project_file_id, Number(row.version_number)]),
  );
  const repositories = new Map<string, string>(
    repositoryRows.map((row) => [row.id, row.name]),
  );
  return ((filesResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    repositoryId: String(row.repository_id),
    repositoryName: repositories.get(String(row.repository_id)) ?? "Repositorio",
    path: String(row.path),
    language: row.language ? String(row.language) : null,
    sizeBytes: Number(row.size_bytes),
    versionNumber:
      selectedVersions.get(String(row.id)) ?? Number(row.current_version_number),
    selected: selectedVersions.has(String(row.id)),
  }));
}

export async function loadConversationSelectedFileContext(input: {
  supabase: CurrentWorkspaceContext["supabase"];
  workspaceId: string;
  projectId: string;
  conversationId: string;
  maxFiles?: number;
  maxCharacters?: number;
}): Promise<{
  rendered: string;
  sources: Array<{
    sourceType: "project_file";
    sourceId: string;
    title: string;
    score: number;
    documentId: null;
    fileName: string;
    chunkIndex: null;
  }>;
  fileIds: string[];
}> {
  const maxFiles = input.maxFiles ?? 8;
  const maxCharacters = input.maxCharacters ?? 160_000;
  const { data: contexts, error } = await input.supabase
    .from("conversation_file_contexts")
    .select("project_file_id, version_number")
    .eq("workspace_id", input.workspaceId)
    .eq("project_id", input.projectId)
    .eq("conversation_id", input.conversationId)
    .order("created_at")
    .limit(maxFiles);
  if (error || !contexts?.length) return { rendered: "", sources: [], fileIds: [] };

  type ConversationContextRow = {
    project_file_id: string;
    version_number: number;
  };
  const contextRows = contexts as unknown as ConversationContextRow[];
  const fileIds = contextRows.map((row) => row.project_file_id);
  const requestedVersions = new Map<string, number>(
    contextRows.map((row) => [row.project_file_id, Number(row.version_number)]),
  );
  const versionNumbers = [
    ...new Set(contextRows.map((row) => Number(row.version_number))),
  ];

  const [filesResult, versionsResult] = await Promise.all([
    input.supabase
      .from("project_files")
      .select("id, path, content_text, current_version_number")
      .eq("workspace_id", input.workspaceId)
      .eq("project_id", input.projectId)
      .eq("status", "active")
      .in("id", fileIds),
    input.supabase
      .from("project_file_versions")
      .select("file_id, version_number, content_text")
      .eq("workspace_id", input.workspaceId)
      .eq("project_id", input.projectId)
      .in("file_id", fileIds)
      .in("version_number", versionNumbers),
  ]);
  if (filesResult.error || versionsResult.error || !filesResult.data?.length) {
    return { rendered: "", sources: [], fileIds: [] };
  }

  type ContextFileRow = {
    id: string;
    path: string;
    content_text: string | null;
    current_version_number: number;
  };
  type ContextVersionRow = {
    file_id: string;
    version_number: number;
    content_text: string;
  };
  const fileRows = filesResult.data as unknown as ContextFileRow[];
  const versionRows = (versionsResult.data ?? []) as unknown as ContextVersionRow[];
  const byId = new Map<string, ContextFileRow>(
    fileRows.map((row) => [row.id, row]),
  );
  const versionsByKey = new Map<string, string>(
    versionRows.map((row) => [
      `${row.file_id}:${Number(row.version_number)}`,
      row.content_text,
    ]),
  );
  let usedCharacters = 0;
  const sections: string[] = [];
  const sources: Array<{
    sourceType: "project_file";
    sourceId: string;
    title: string;
    score: number;
    documentId: null;
    fileName: string;
    chunkIndex: null;
  }> = [];
  const usedIds: string[] = [];

  for (const context of contextRows) {
    const fileId = String(context.project_file_id);
    const row = byId.get(fileId);
    if (!row) continue;
    const requestedVersion = requestedVersions.get(fileId) ?? Number(row.current_version_number);
    const pinnedContent = versionsByKey.get(`${fileId}:${requestedVersion}`);
    const isCurrentVersion = requestedVersion === Number(row.current_version_number);
    const content =
      pinnedContent ??
      (isCurrentVersion && row.content_text ? String(row.content_text) : "");
    if (!content) continue;

    const remaining = maxCharacters - usedCharacters;
    if (remaining <= 0) break;
    const clipped = content.slice(0, remaining);
    sections.push(
      `--- ARCHIVO DEL PROYECTO: ${String(row.path)} (v${requestedVersion}) ---\n${clipped}\n--- FIN DEL ARCHIVO ---`,
    );
    usedCharacters += clipped.length;
    usedIds.push(fileId);
    sources.push({
      sourceType: "project_file",
      sourceId: fileId,
      title: String(row.path),
      score: 1,
      documentId: null,
      fileName: String(row.path),
      chunkIndex: null,
    });
  }
  return { rendered: sections.join("\n\n"), sources, fileIds: usedIds };
}

export async function searchProjectFiles(input: {
  supabase: CurrentWorkspaceContext["supabase"];
  workspaceId: string;
  projectId: string;
  query: string;
  limit?: number;
}): Promise<ProjectFileRecord[]> {
  const safe = input.query.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _./-]/g, " ").trim();
  let query = input.supabase
    .from("project_files")
    .select(
      "id, workspace_id, project_id, repository_id, path, directory_path, file_name, extension, mime_type, language, size_bytes, checksum, content_text, is_binary, is_indexed, status, current_version_number, created_at, updated_at",
    )
    .eq("workspace_id", input.workspaceId)
    .eq("project_id", input.projectId)
    .eq("status", "active")
    .limit(input.limit ?? 30);
  if (safe) query = query.or(`path.ilike.%${safe}%,content_text.ilike.%${safe}%`);
  const { data, error } = await query.order("path");
  if (error) throw new Error(`No pudimos buscar archivos: ${error.message}`);
  return (data ?? []) as ProjectFileRecord[];
}

export function repositorySummaryValue(value: unknown, key: string): number {
  const record = recordOf(value);
  const number = Number(record[key] ?? 0);
  return Number.isFinite(number) ? number : 0;
}
