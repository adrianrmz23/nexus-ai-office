import type {
  MemoryDocumentRecord,
  MemoryRecord,
  RetrievedMemorySource,
} from "@/modules/memory/domain/memory";
import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";

export type MemoryProjectOption = {
  id: string;
  name: string;
  color: string;
};

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function projectRelation(value: unknown): MemoryProjectOption | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const record = recordOf(raw);
  if (!record.id) return null;
  return {
    id: String(record.id),
    name: String(record.name),
    color: String(record.color),
  };
}

export async function loadMemoryProjects(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<MemoryProjectOption[]> {
  const { data } = await supabase
    .from("projects")
    .select("id, name, color")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name");
  return (data ?? []) as MemoryProjectOption[];
}

export async function loadMemoryDocuments(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters?: { projectId?: string; status?: string },
): Promise<MemoryDocumentRecord[]> {
  let query = supabase
    .from("documents")
    .select(
      "id, workspace_id, project_id, scope_type, title, source_type, file_name, mime_type, file_extension, size_bytes, language, status, extraction_status, embedding_status, chunk_count, error_message, created_at, updated_at, archived_at, projects(id, name, color)",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  const { data, error } = await query;
  if (error) throw new Error(`No pudimos consultar los documentos: ${error.message}`);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    project_id: row.project_id ? String(row.project_id) : null,
    scope_type: row.scope_type as MemoryDocumentRecord["scope_type"],
    title: String(row.title),
    source_type: String(row.source_type),
    file_name: row.file_name ? String(row.file_name) : null,
    mime_type: row.mime_type ? String(row.mime_type) : null,
    file_extension: row.file_extension ? String(row.file_extension) : null,
    size_bytes: Number(row.size_bytes),
    language: row.language ? String(row.language) : null,
    status: row.status as MemoryDocumentRecord["status"],
    extraction_status: String(row.extraction_status),
    embedding_status: String(row.embedding_status),
    chunk_count: Number(row.chunk_count),
    error_message: row.error_message ? String(row.error_message) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    project: projectRelation(row.projects),
  }));
}

export async function loadMemories(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters?: { projectId?: string; status?: string; query?: string },
): Promise<MemoryRecord[]> {
  let query = supabase
    .from("memories")
    .select(
      "id, workspace_id, project_id, scope_type, memory_type, title, content, importance, status, created_at, updated_at, archived_at, projects(id, name, color)",
    )
    .eq("workspace_id", workspaceId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.query) {
    const safe = filters.query
      .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`No pudimos consultar las memorias: ${error.message}`);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    project_id: row.project_id ? String(row.project_id) : null,
    scope_type: row.scope_type as MemoryRecord["scope_type"],
    memory_type: row.memory_type as MemoryRecord["memory_type"],
    title: String(row.title),
    content: String(row.content),
    importance: Number(row.importance),
    status: row.status as MemoryRecord["status"],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    project: projectRelation(row.projects),
  }));
}

export async function loadMemoryStats(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
) {
  const [documents, ready, memories, retrievals] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "ready"),
    supabase.from("memories").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("memory_retrieval_logs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);
  return {
    documents: documents.count ?? 0,
    readyDocuments: ready.count ?? 0,
    activeMemories: memories.count ?? 0,
    retrievals: retrievals.count ?? 0,
  };
}

export async function searchMemoryText(input: {
  supabase: CurrentWorkspaceContext["supabase"];
  workspaceId: string;
  projectId: string | null;
  query: string;
}): Promise<RetrievedMemorySource[]> {
  if (!input.query.trim() || !input.projectId) return [];
  const { data, error } = await input.supabase.rpc("search_memory_context", {
    p_workspace_id: input.workspaceId,
    p_project_id: input.projectId,
    p_agent_id: null,
    p_conversation_id: null,
    p_query: input.query,
    p_limit: 12,
  });
  if (error || !Array.isArray(data)) return [];
  return data.map((item) => {
    const row = recordOf(item);
    return {
      sourceType: String(row.source_type) as RetrievedMemorySource["sourceType"],
      sourceId: String(row.source_id),
      title: String(row.title),
      content: String(row.content),
      score: Math.max(0, Math.min(1, Number(row.score))),
      documentId: row.document_id ? String(row.document_id) : null,
      metadata: recordOf(row.metadata),
    };
  });
}
