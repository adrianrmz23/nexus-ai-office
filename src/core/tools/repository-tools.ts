import { z } from "zod";

import type { NexusTool, ToolExecutionContext } from "@/core/tools/contracts";
import { sha256 } from "@/modules/memory/domain/document-processing";

async function logAccess(
  context: ToolExecutionContext,
  input: {
    accessType: "list" | "search" | "read" | "related" | "compare" | "propose";
    repositoryId?: string | null;
    fileId?: string | null;
    queryText?: string | null;
    resultSummary?: Record<string, unknown>;
  },
) {
  await context.supabase.from("agent_file_access_logs").insert({
    workspace_id: context.membership.workspaceId,
    project_id: context.projectId,
    repository_id: input.repositoryId ?? null,
    file_id: input.fileId ?? null,
    conversation_id: context.conversationId,
    message_id: context.sourceMessageId,
    run_id: null,
    agent_id: context.agentId,
    access_type: input.accessType,
    query_text: input.queryText ?? null,
    result_summary: input.resultSummary ?? {},
    created_by: context.user.id,
  });
}

const listProjectFilesInput = z.object({
  repositoryId: z.string().uuid().nullable().default(null),
  directory: z.string().max(500).default(""),
  limit: z.number().int().min(1).max(200).default(100),
});

export const listProjectFilesTool: NexusTool<typeof listProjectFilesInput> = {
  name: "list_project_files",
  description: "Lista archivos reales del proyecto, opcionalmente filtrados por repositorio o carpeta.",
  schema: listProjectFilesInput,
  requiresHumanConfirmation: false,
  async execute(input, context) {
    let query = context.supabase
      .from("project_files")
      .select("id, repository_id, path, language, size_bytes, current_version_number")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("status", "active")
      .order("path")
      .limit(input.limit);
    if (input.repositoryId) query = query.eq("repository_id", input.repositoryId);
    if (input.directory) query = query.like("path", `${input.directory.replace(/[%_]/g, "")}%`);
    const { data, error } = await query;
    if (error) return { ok: false, message: error.message, data: {} };
    await logAccess(context, {
      accessType: "list",
      repositoryId: input.repositoryId,
      queryText: input.directory,
      resultSummary: { count: data?.length ?? 0 },
    });
    return { ok: true, message: `${data?.length ?? 0} archivos encontrados.`, data: { files: data ?? [] } };
  },
};

const searchProjectFilesInput = z.object({
  query: z.string().trim().min(1).max(300),
  limit: z.number().int().min(1).max(50).default(20),
});

export const searchProjectFilesTool: NexusTool<typeof searchProjectFilesInput> = {
  name: "search_project_files",
  description: "Busca por ruta o contenido dentro de los archivos indexados del proyecto.",
  schema: searchProjectFilesInput,
  requiresHumanConfirmation: false,
  async execute(input, context) {
    const safe = input.query.replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _./-]/g, " ").trim();
    const { data, error } = await context.supabase
      .from("project_files")
      .select("id, repository_id, path, language, size_bytes, current_version_number")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("status", "active")
      .or(`path.ilike.%${safe}%,content_text.ilike.%${safe}%`)
      .order("path")
      .limit(input.limit);
    if (error) return { ok: false, message: error.message, data: {} };
    await logAccess(context, {
      accessType: "search",
      queryText: input.query,
      resultSummary: { count: data?.length ?? 0 },
    });
    return { ok: true, message: `${data?.length ?? 0} coincidencias.`, data: { files: data ?? [] } };
  },
};

const readProjectFileInput = z.object({
  fileId: z.string().uuid(),
  maxCharacters: z.number().int().min(1_000).max(300_000).default(120_000),
});

export const readProjectFileTool: NexusTool<typeof readProjectFileInput> = {
  name: "read_project_file",
  description: "Lee una versión actual de un archivo real del proyecto.",
  schema: readProjectFileInput,
  requiresHumanConfirmation: false,
  async execute(input, context) {
    const { data, error } = await context.supabase
      .from("project_files")
      .select("id, repository_id, path, language, content_text, current_version_number, checksum")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("id", input.fileId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) return { ok: false, message: error?.message ?? "Archivo no encontrado.", data: {} };
    const content = String(data.content_text ?? "").slice(0, input.maxCharacters);
    await logAccess(context, {
      accessType: "read",
      repositoryId: data.repository_id,
      fileId: data.id,
      resultSummary: { path: data.path, characters: content.length, version: data.current_version_number },
    });
    return { ok: true, message: `Archivo ${data.path} leído.`, data: { ...data, content_text: content } };
  },
};

const relatedFilesInput = z.object({ fileId: z.string().uuid(), limit: z.number().int().min(1).max(30).default(12) });

export const findRelatedFilesTool: NexusTool<typeof relatedFilesInput> = {
  name: "find_related_files",
  description: "Encuentra archivos relacionados por carpeta, nombre y extensión.",
  schema: relatedFilesInput,
  requiresHumanConfirmation: false,
  async execute(input, context) {
    const { data: source } = await context.supabase
      .from("project_files")
      .select("id, repository_id, directory_path, file_name, extension, path")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("id", input.fileId)
      .maybeSingle();
    if (!source) return { ok: false, message: "Archivo no encontrado.", data: {} };
    const stem = String(source.file_name).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "");
    const filters = [`directory_path.eq.${String(source.directory_path).replace(/,/g, "")}`];
    if (source.extension) filters.push(`extension.eq.${String(source.extension).replace(/,/g, "")}`);
    if (stem) filters.push(`file_name.ilike.%${stem}%`);
    const { data, error } = await context.supabase
      .from("project_files")
      .select("id, repository_id, path, language, size_bytes, current_version_number")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("status", "active")
      .neq("id", input.fileId)
      .or(filters.join(","))
      .order("path")
      .limit(input.limit);
    if (error) return { ok: false, message: error.message, data: {} };
    await logAccess(context, {
      accessType: "related",
      repositoryId: source.repository_id,
      fileId: source.id,
      resultSummary: { count: data?.length ?? 0 },
    });
    return { ok: true, message: `${data?.length ?? 0} archivos relacionados.`, data: { files: data ?? [] } };
  },
};

const compareVersionsInput = z.object({
  fileId: z.string().uuid(),
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
});

export const compareFileVersionsTool: NexusTool<typeof compareVersionsInput> = {
  name: "compare_file_versions",
  description: "Recupera dos versiones de un archivo para compararlas de forma verificable.",
  schema: compareVersionsInput,
  requiresHumanConfirmation: false,
  async execute(input, context) {
    const { data, error } = await context.supabase
      .from("project_file_versions")
      .select("file_id, version_number, content_text, checksum, created_at")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("file_id", input.fileId)
      .in("version_number", [input.fromVersion, input.toVersion]);
    if (error || !data || data.length !== 2) {
      return { ok: false, message: error?.message ?? "No encontramos ambas versiones.", data: {} };
    }
    await logAccess(context, {
      accessType: "compare",
      fileId: input.fileId,
      resultSummary: { versions: [input.fromVersion, input.toVersion] },
    });
    return { ok: true, message: "Versiones recuperadas.", data: { versions: data } };
  },
};

const proposeFileChangeInput = z.object({
  fileId: z.string().uuid(),
  title: z.string().min(3).max(180),
  summary: z.string().max(8_000).default(""),
  proposedContent: z.string().min(1).max(1_100_000),
});

export const proposeFileChangeTool: NexusTool<typeof proposeFileChangeInput> = {
  name: "propose_file_change",
  description: "Crea una propuesta de archivo completo que requiere aprobación humana antes de convertirse en una versión.",
  schema: proposeFileChangeInput,
  requiresHumanConfirmation: true,
  async execute(input, context) {
    if (new TextEncoder().encode(input.proposedContent).byteLength > 1_048_576) {
      return {
        ok: false,
        message: "El archivo propuesto supera el límite de 1 MB.",
        data: {},
      };
    }
    const { data: file, error: fileError } = await context.supabase
      .from("project_files")
      .select("id, repository_id, project_id, current_version_number, path")
      .eq("workspace_id", context.membership.workspaceId)
      .eq("project_id", context.projectId)
      .eq("id", input.fileId)
      .eq("status", "active")
      .maybeSingle();
    if (fileError || !file) return { ok: false, message: fileError?.message ?? "Archivo no encontrado.", data: {} };
    const { data, error } = await context.supabase
      .from("file_change_proposals")
      .insert({
        workspace_id: context.membership.workspaceId,
        project_id: context.projectId,
        repository_id: file.repository_id,
        file_id: file.id,
        conversation_id: context.conversationId,
        source_message_id: context.sourceMessageId,
        proposed_by_agent_id: context.agentId,
        title: input.title,
        summary: input.summary,
        proposed_content: input.proposedContent,
        proposed_checksum: sha256(input.proposedContent),
        base_version_number: file.current_version_number,
        status: "proposed",
        created_by: context.user.id,
        updated_by: context.user.id,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: error?.message ?? "No se pudo crear la propuesta.", data: {} };
    await logAccess(context, {
      accessType: "propose",
      repositoryId: file.repository_id,
      fileId: file.id,
      resultSummary: { proposalId: data.id, path: file.path },
    });
    return { ok: true, message: "Propuesta creada y pendiente de aprobación humana.", data: { proposalId: data.id } };
  },
};

export const REPOSITORY_TOOLS = [
  listProjectFilesTool,
  searchProjectFilesTool,
  readProjectFileTool,
  findRelatedFilesTool,
  compareFileVersionsTool,
  proposeFileChangeTool,
] as const;
