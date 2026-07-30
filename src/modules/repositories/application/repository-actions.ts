"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  fileProposalIdSchema,
  importRepositorySchema,
  proposalFormSchema,
  repositoryIdSchema,
  reviewProposalSchema,
} from "@/modules/repositories/domain/repository-schema";
import {
  extractRepositoryZip,
  MAX_REPOSITORY_ZIP_BYTES,
  type ExtractedRepositoryFile,
} from "@/modules/repositories/domain/zip-processing";
import { consumeRateLimit, recordSecurityEvent } from "@/lib/security/rate-limit";
import { sha256 } from "@/modules/memory/domain/document-processing";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos del repositorio.";
}

function redirectMessage(path: string, type: "error" | "success", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${type}=${encodeURIComponent(message)}`);
}

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

function chunksOf<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function validateProject(
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"],
  workspaceId: string,
  projectId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .neq("status", "archived")
    .maybeSingle();
  return Boolean(data);
}

function validRepositoryStoragePath(input: {
  path: string;
  workspaceId: string;
  projectId: string;
}): boolean {
  const prefix = `${input.workspaceId}/${input.projectId}/uploads/`;
  return (
    input.path.startsWith(prefix) &&
    !input.path.includes("..") &&
    input.path.length <= 700
  );
}

async function removeStoredZip(
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"],
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("nexus-repositories")
    .remove([storagePath]);
  if (error) {
    console.error("No pudimos retirar el ZIP temporal:", error.message);
  }
}


async function enforceRepositoryRateLimit(input: {
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"];
  workspaceId: string;
  storagePath: string;
  returnTo: string;
}) {
  let result;
  try {
    result = await consumeRateLimit({
      supabase: input.supabase,
      workspaceId: input.workspaceId,
      actionKey: "repository:import",
      limit: 4,
      windowSeconds: 900,
    });
  } catch (error) {
    if (input.storagePath) {
      await removeStoredZip(input.supabase, input.storagePath);
    }
    redirectMessage(
      input.returnTo,
      "error",
      error instanceof Error
        ? error.message
        : "No pudimos validar el límite de importación.",
    );
  }

  if (!result.allowed) {
    if (input.storagePath) {
      await removeStoredZip(input.supabase, input.storagePath);
    }
    await recordSecurityEvent({
      supabase: input.supabase,
      workspaceId: input.workspaceId,
      eventType: "rate_limit.repository_blocked",
      severity: "warning",
      source: "repository_import",
      metadata: { retryAfterSeconds: result.retryAfterSeconds },
    });
    redirectMessage(
      input.returnTo,
      "error",
      `Espera ${result.retryAfterSeconds} segundos antes de procesar otro repositorio.`,
    );
  }
}

async function downloadStoredZip(input: {
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"];
  storagePath: string;
}): Promise<Uint8Array> {
  const { data, error } = await input.supabase.storage
    .from("nexus-repositories")
    .download(input.storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? "No pudimos recuperar el ZIP privado.");
  }
  if (data.size === 0) throw new Error("El ZIP está vacío.");
  if (data.size > MAX_REPOSITORY_ZIP_BYTES) {
    throw new Error("El ZIP supera el límite seguro de 12 MB.");
  }
  return new Uint8Array(await data.arrayBuffer());
}

async function persistNewFiles(input: {
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"];
  repositoryId: string;
  files: ExtractedRepositoryFile[];
}) {
  const payload = input.files.map((file) => ({
    id: randomUUID(),
    path: file.path,
    directoryPath: file.directoryPath,
    fileName: file.fileName,
    extension: file.extension,
    mimeType: file.mimeType,
    language: file.language,
    sizeBytes: file.sizeBytes,
    checksum: file.checksum,
    content: file.content,
  }));

  for (const batch of chunksOf(payload, 20)) {
    const { error } = await input.supabase.rpc(
      "insert_repository_file_batch",
      {
        p_repository_id: input.repositoryId,
        p_files: batch,
      },
    );
    if (error) {
      throw new Error(`No pudimos registrar el lote de archivos: ${error.message}`);
    }
  }
}

export async function importRepositoryZip(formData: FormData) {
  const projectId = textValue(formData, "projectId");
  const storagePath = textValue(formData, "storagePath");
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const parsed = importRepositorySchema.safeParse({
    projectId,
    name: textValue(formData, "name"),
    repositoryUrl: textValue(formData, "repositoryUrl"),
    defaultBranch: textValue(formData, "defaultBranch") || "main",
  });
  if (!parsed.success) {
    if (
      storagePath &&
      validRepositoryStoragePath({
        path: storagePath,
        workspaceId: membership.workspaceId,
        projectId,
      })
    ) {
      await removeStoredZip(supabase, storagePath);
    }
    redirectMessage("/app/repositorios/nuevo", "error", firstIssue(parsed.error));
  }
  if (!canManage(membership.role)) {
    redirectMessage(
      "/app/repositorios",
      "error",
      "Solo un administrador puede importar repositorios.",
    );
  }
  await enforceRepositoryRateLimit({
    supabase,
    workspaceId: membership.workspaceId,
    storagePath,
    returnTo: "/app/repositorios/nuevo",
  });
  if (!(await validateProject(supabase, membership.workspaceId, parsed.data.projectId))) {
    if (storagePath) await removeStoredZip(supabase, storagePath);
    redirectMessage(
      "/app/repositorios/nuevo",
      "error",
      "El proyecto seleccionado no está disponible.",
    );
  }
  if (
    !validRepositoryStoragePath({
      path: storagePath,
      workspaceId: membership.workspaceId,
      projectId: parsed.data.projectId,
    })
  ) {
    redirectMessage(
      "/app/repositorios/nuevo",
      "error",
      "La carga privada del repositorio no es válida.",
    );
  }

  let bytes: Uint8Array;
  let extracted: ReturnType<typeof extractRepositoryZip>;
  try {
    bytes = await downloadStoredZip({ supabase, storagePath });
    extracted = extractRepositoryZip(bytes);
  } catch (error) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      "/app/repositorios/nuevo",
      "error",
      error instanceof Error ? error.message : "No pudimos procesar el ZIP.",
    );
  }

  const repositoryId = randomUUID();
  const sourceChecksum = sha256(bytes);
  const { error: repositoryError } = await supabase
    .from("project_repositories")
    .insert({
      id: repositoryId,
      workspace_id: membership.workspaceId,
      project_id: parsed.data.projectId,
      name: parsed.data.name,
      source_type: "zip",
      repository_url: parsed.data.repositoryUrl,
      default_branch: parsed.data.defaultBranch,
      status: "processing",
      source_checksum: sourceChecksum,
      storage_bucket: null,
      storage_path: null,
      created_by: user.id,
      updated_by: user.id,
    });
  if (repositoryError) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      "/app/repositorios/nuevo",
      "error",
      repositoryError.code === "23505"
        ? "Ya existe un repositorio con ese nombre dentro del proyecto."
        : repositoryError.message,
    );
  }

  try {
    await persistNewFiles({
      supabase,
      repositoryId,
      files: extracted.files,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos importar los archivos.";
    await supabase
      .from("project_repositories")
      .update({ status: "failed", error_message: message, updated_by: user.id })
      .eq("id", repositoryId);
    await removeStoredZip(supabase, storagePath);
    redirectMessage("/app/repositorios", "error", message);
  }

  const totalBytes = extracted.files.reduce(
    (sum, item) => sum + item.sizeBytes,
    0,
  );
  const summary = {
    imported: extracted.files.length,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    skipped: extracted.skipped.length,
    skippedReasons: extracted.skipped.slice(0, 100),
    rootPrefix: extracted.rootPrefix,
  };
  const { error: repositoryUpdateError } = await supabase
    .from("project_repositories")
    .update({
      status: "active",
      file_count: extracted.files.length,
      indexed_file_count: extracted.files.length,
      total_bytes: totalBytes,
      import_summary: summary,
      last_import_at: new Date().toISOString(),
      error_message: null,
      updated_by: user.id,
    })
    .eq("id", repositoryId);
  if (repositoryUpdateError) {
    await supabase
      .from("project_repositories")
      .update({
        status: "failed",
        error_message: repositoryUpdateError.message,
        updated_by: user.id,
      })
      .eq("id", repositoryId);
    await removeStoredZip(supabase, storagePath);
    redirectMessage("/app/repositorios", "error", repositoryUpdateError.message);
  }

  if (parsed.data.repositoryUrl) {
    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update({
        repository_url: parsed.data.repositoryUrl,
        updated_by: user.id,
      })
      .eq("workspace_id", membership.workspaceId)
      .eq("id", parsed.data.projectId)
      .is("repository_url", null);
    if (projectUpdateError) {
      console.error(
        "El repositorio se importó, pero no pudimos copiar la URL al proyecto:",
        projectUpdateError.message,
      );
    }
  }

  await removeStoredZip(supabase, storagePath);

  revalidatePath("/app");
  revalidatePath("/app/repositorios");
  revalidatePath(`/app/proyectos/${parsed.data.projectId}`);
  redirectMessage(
    `/app/repositorios/${repositoryId}`,
    "success",
    `Se importaron ${extracted.files.length} archivos seguros.`,
  );
}

export async function refreshRepositoryZip(formData: FormData) {
  const idResult = repositoryIdSchema.safeParse(
    textValue(formData, "repositoryId"),
  );
  if (!idResult.success) {
    redirectMessage("/app/repositorios", "error", "El repositorio no es válido.");
  }
  const storagePath = textValue(formData, "storagePath");

  const { supabase, user, membership } = await requireCurrentWorkspace();
  if (!canManage(membership.role)) {
    redirectMessage(
      `/app/repositorios/${idResult.data}`,
      "error",
      "No tienes permisos para actualizar este repositorio.",
    );
  }
  await enforceRepositoryRateLimit({
    supabase,
    workspaceId: membership.workspaceId,
    storagePath,
    returnTo: `/app/repositorios/${idResult.data}`,
  });
  const { data: repository, error: repositoryError } = await supabase
    .from("project_repositories")
    .select("id, project_id, name")
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .maybeSingle();
  if (repositoryError || !repository) {
    redirectMessage(
      "/app/repositorios",
      "error",
      "No encontramos el repositorio.",
    );
  }
  if (
    !validRepositoryStoragePath({
      path: storagePath,
      workspaceId: membership.workspaceId,
      projectId: repository.project_id,
    })
  ) {
    redirectMessage(
      `/app/repositorios/${repository.id}`,
      "error",
      "La carga privada del repositorio no es válida.",
    );
  }

  let bytes: Uint8Array;
  let extracted: ReturnType<typeof extractRepositoryZip>;
  try {
    bytes = await downloadStoredZip({ supabase, storagePath });
    extracted = extractRepositoryZip(bytes);
  } catch (error) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      `/app/repositorios/${repository.id}`,
      "error",
      error instanceof Error ? error.message : "No pudimos procesar el ZIP.",
    );
  }

  const { data: existingData, error: existingError } = await supabase
    .from("project_files")
    .select("id, path, checksum, current_version_number, status")
    .eq("workspace_id", membership.workspaceId)
    .eq("repository_id", repository.id);
  if (existingError) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      `/app/repositorios/${repository.id}`,
      "error",
      existingError.message,
    );
  }

  type ExistingFileRow = {
    id: string;
    path: string;
    checksum: string;
    current_version_number: number;
    status: "active" | "deleted" | "archived";
  };
  const existingRows = (existingData ?? []) as unknown as ExistingFileRow[];
  const existing = new Map(existingRows.map((row) => [row.path, row]));
  const importedPaths = new Set(extracted.files.map((item) => item.path));
  const newFiles: ExtractedRepositoryFile[] = [];
  const changed: Array<{
    file: ExtractedRepositoryFile;
    row: ExistingFileRow;
  }> = [];
  let unchanged = 0;

  for (const fileItem of extracted.files) {
    const row = existing.get(fileItem.path);
    if (!row) newFiles.push(fileItem);
    else if (row.checksum !== fileItem.checksum || row.status !== "active") {
      changed.push({ file: fileItem, row });
    } else unchanged += 1;
  }

  try {
    if (newFiles.length) {
      await persistNewFiles({
        supabase,
        repositoryId: repository.id,
        files: newFiles,
      });
    }

    for (const batch of chunksOf(changed, 10)) {
      await Promise.all(
        batch.map(async ({ file: fileItem, row }) => {
          const { error } = await supabase.rpc(
            "apply_repository_file_import_update",
            {
              p_file_id: row.id,
              p_payload: {
                directoryPath: fileItem.directoryPath,
                fileName: fileItem.fileName,
                extension: fileItem.extension,
                mimeType: fileItem.mimeType,
                language: fileItem.language,
                sizeBytes: fileItem.sizeBytes,
                checksum: fileItem.checksum,
                content: fileItem.content,
              },
            },
          );
          if (error) throw new Error(error.message);
        }),
      );
    }
  } catch (error) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      `/app/repositorios/${repository.id}`,
      "error",
      error instanceof Error
        ? error.message
        : "No pudimos actualizar los archivos.",
    );
  }

  const deletedIds = existingRows
    .filter((row) => !importedPaths.has(row.path) && row.status === "active")
    .map((row) => row.id);
  if (deletedIds.length) {
    const { error } = await supabase
      .from("project_files")
      .update({ status: "deleted", updated_by: user.id })
      .eq("workspace_id", membership.workspaceId)
      .in("id", deletedIds);
    if (error) {
      await removeStoredZip(supabase, storagePath);
      redirectMessage(
        `/app/repositorios/${repository.id}`,
        "error",
        error.message,
      );
    }
  }

  const totalBytes = extracted.files.reduce(
    (sum, item) => sum + item.sizeBytes,
    0,
  );
  const summary = {
    imported: newFiles.length,
    updated: changed.length,
    unchanged,
    deleted: deletedIds.length,
    skipped: extracted.skipped.length,
    skippedReasons: extracted.skipped.slice(0, 100),
    rootPrefix: extracted.rootPrefix,
  };
  const { error: updateRepositoryError } = await supabase
    .from("project_repositories")
    .update({
      status: "active",
      file_count: extracted.files.length,
      indexed_file_count: extracted.files.length,
      total_bytes: totalBytes,
      source_checksum: sha256(bytes),
      storage_bucket: null,
      storage_path: null,
      import_summary: summary,
      last_import_at: new Date().toISOString(),
      error_message: null,
      updated_by: user.id,
    })
    .eq("id", repository.id);
  if (updateRepositoryError) {
    await removeStoredZip(supabase, storagePath);
    redirectMessage(
      `/app/repositorios/${repository.id}`,
      "error",
      updateRepositoryError.message,
    );
  }

  await removeStoredZip(supabase, storagePath);

  revalidatePath("/app/repositorios");
  revalidatePath(`/app/repositorios/${repository.id}`);
  revalidatePath(`/app/proyectos/${repository.project_id}`);
  redirectMessage(
    `/app/repositorios/${repository.id}`,
    "success",
    `Actualización completada: ${newFiles.length} nuevos, ${changed.length} modificados y ${deletedIds.length} retirados.`,
  );
}

export async function setRepositoryStatus(formData: FormData) {
  const idResult = repositoryIdSchema.safeParse(textValue(formData, "repositoryId"));
  const status = textValue(formData, "status");
  if (!idResult.success || !["active", "archived"].includes(status)) {
    redirectMessage("/app/repositorios", "error", "No pudimos actualizar el repositorio.");
  }
  const { supabase, user, membership } = await requireCurrentWorkspace();
  if (!canManage(membership.role)) {
    redirectMessage("/app/repositorios", "error", "No tienes permisos para esta acción.");
  }
  const { data, error } = await supabase
    .from("project_repositories")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .select("id, project_id")
    .maybeSingle();
  if (error || !data) redirectMessage("/app/repositorios", "error", error?.message ?? "No encontramos el repositorio.");
  revalidatePath("/app/repositorios");
  revalidatePath(`/app/repositorios/${data.id}`);
  revalidatePath(`/app/proyectos/${data.project_id}`);
  redirectMessage("/app/repositorios", "success", status === "archived" ? "Repositorio archivado." : "Repositorio restaurado.");
}

export async function createFileChangeProposal(formData: FormData) {
  const result = proposalFormSchema.safeParse({
    fileId: textValue(formData, "fileId"),
    title: textValue(formData, "title"),
    summary: textValue(formData, "summary"),
    proposedContent: textValue(formData, "proposedContent"),
    conversationId: textValue(formData, "conversationId"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    proposedByAgentId: textValue(formData, "proposedByAgentId"),
  });
  if (!result.success) redirectMessage("/app/repositorios", "error", firstIssue(result.error));
  if (new TextEncoder().encode(result.data.proposedContent).byteLength > 1_048_576) {
    redirectMessage("/app/repositorios", "error", "El archivo propuesto supera el límite de 1 MB.");
  }
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data: file, error: fileError } = await supabase
    .from("project_files")
    .select("id, project_id, repository_id, current_version_number, path")
    .eq("workspace_id", membership.workspaceId)
    .eq("id", result.data.fileId)
    .eq("status", "active")
    .maybeSingle();
  if (fileError || !file) redirectMessage("/app/repositorios", "error", "No encontramos el archivo activo.");
  const { data: proposal, error } = await supabase
    .from("file_change_proposals")
    .insert({
      workspace_id: membership.workspaceId,
      project_id: file.project_id,
      repository_id: file.repository_id,
      file_id: file.id,
      conversation_id: result.data.conversationId,
      source_message_id: result.data.sourceMessageId,
      proposed_by_agent_id: result.data.proposedByAgentId,
      title: result.data.title,
      summary: result.data.summary,
      proposed_content: result.data.proposedContent,
      proposed_checksum: sha256(result.data.proposedContent),
      base_version_number: file.current_version_number,
      status: "proposed",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error || !proposal) {
    redirectMessage(
      `/app/repositorios/${file.repository_id}/archivos/${file.id}`,
      "error",
      error?.message ?? "No pudimos guardar la propuesta.",
    );
  }
  revalidatePath(`/app/repositorios/${file.repository_id}/archivos/${file.id}`);
  redirectMessage(
    `/app/repositorios/${file.repository_id}/archivos/${file.id}?proposal=${proposal.id}`,
    "success",
    "La propuesta quedó pendiente de aprobación humana.",
  );
}

export async function reviewFileChangeProposal(formData: FormData) {
  const result = reviewProposalSchema.safeParse({
    proposalId: textValue(formData, "proposalId"),
    status: textValue(formData, "status"),
    reviewNote: textValue(formData, "reviewNote"),
  });
  if (!result.success) redirectMessage("/app/repositorios", "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data: proposal } = await supabase
    .from("file_change_proposals")
    .select("id, repository_id, file_id")
    .eq("workspace_id", membership.workspaceId)
    .eq("id", result.data.proposalId)
    .maybeSingle();
  if (!proposal) redirectMessage("/app/repositorios", "error", "No encontramos la propuesta.");

  if (result.data.status === "approved") {
    const { error } = await supabase.rpc("approve_file_change_proposal", {
      p_proposal_id: proposal.id,
      p_review_note: result.data.reviewNote,
    });
    if (error) {
      redirectMessage(
        `/app/repositorios/${proposal.repository_id}/archivos/${proposal.file_id}`,
        "error",
        error.message,
      );
    }
  } else {
    const { error } = await supabase
      .from("file_change_proposals")
      .update({
        status: result.data.status,
        review_note: result.data.reviewNote,
        updated_by: user.id,
      })
      .eq("workspace_id", membership.workspaceId)
      .eq("id", proposal.id);
    if (error) {
      redirectMessage(
        `/app/repositorios/${proposal.repository_id}/archivos/${proposal.file_id}`,
        "error",
        error.message,
      );
    }
  }

  revalidatePath(`/app/repositorios/${proposal.repository_id}`);
  revalidatePath(`/app/repositorios/${proposal.repository_id}/archivos/${proposal.file_id}`);
  redirectMessage(
    `/app/repositorios/${proposal.repository_id}/archivos/${proposal.file_id}`,
    "success",
    result.data.status === "approved"
      ? "La propuesta fue aprobada y creó una nueva versión del archivo."
      : "La revisión fue registrada.",
  );
}

export async function archiveFileProposal(formData: FormData) {
  const idResult = fileProposalIdSchema.safeParse(textValue(formData, "proposalId"));
  if (!idResult.success) redirectMessage("/app/repositorios", "error", "La propuesta no es válida.");
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("file_change_proposals")
    .update({ status: "archived", archived_at: new Date().toISOString(), updated_by: user.id })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .select("repository_id, file_id")
    .maybeSingle();
  if (error || !data) redirectMessage("/app/repositorios", "error", "No encontramos la propuesta.");
  revalidatePath(`/app/repositorios/${data.repository_id}/archivos/${data.file_id}`);
  redirectMessage(`/app/repositorios/${data.repository_id}/archivos/${data.file_id}`, "success", "La propuesta fue archivada.");
}
