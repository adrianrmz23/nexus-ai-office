"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateEmbeddings, vectorLiteral } from "@/modules/memory/application/embedding-service";
import {
  chunkDocument,
  detectDocumentRisk,
  fileExtension,
  isIndexableTextFile,
  MAX_DOCUMENT_BYTES,
  MAX_INDEXABLE_BYTES,
  normalizeTextContent,
  safeFileName,
  sha256,
} from "@/modules/memory/domain/document-processing";
import {
  createMemorySchema,
  documentIdSchema,
  memoryIdSchema,
  memoryStatusSchema,
  uploadDocumentSchema,
} from "@/modules/memory/domain/memory-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

function redirectMessage(type: "error" | "success", message: string): never {
  redirect(`/app/memoria?${type}=${encodeURIComponent(message)}`);
}

async function validateProject(
  supabase: Awaited<ReturnType<typeof requireCurrentWorkspace>>["supabase"],
  workspaceId: string,
  projectId: string | null,
): Promise<boolean> {
  if (!projectId) return true;
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", projectId)
    .neq("status", "archived")
    .maybeSingle();
  return Boolean(data);
}

export async function uploadMemoryDocument(formData: FormData) {
  const inputResult = uploadDocumentSchema.safeParse({
    scopeType: textValue(formData, "scopeType"),
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
  });
  if (!inputResult.success) redirectMessage("error", firstIssue(inputResult.error));

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    redirectMessage("error", "Selecciona un archivo para agregar al contexto.");
  }
  if (fileValue.size > MAX_DOCUMENT_BYTES) {
    redirectMessage("error", "El archivo supera el límite seguro de 768 KB.");
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();
  const projectId =
    inputResult.data.scopeType === "global" ? null : inputResult.data.projectId;
  if (!(await validateProject(supabase, membership.workspaceId, projectId))) {
    redirectMessage("error", "El proyecto seleccionado no está disponible.");
  }

  const bytes = new Uint8Array(await fileValue.arrayBuffer());
  const extension = fileExtension(fileValue.name);
  const indexable =
    fileValue.size <= MAX_INDEXABLE_BYTES &&
    isIndexableTextFile(fileValue.name, fileValue.type);
  let textContent = "";

  if (indexable) {
    try {
      textContent = normalizeTextContent(new TextDecoder("utf-8", { fatal: true }).decode(bytes), extension);
    } catch {
      redirectMessage("error", "El archivo parece binario o no utiliza codificación UTF-8.");
    }
  }

  const risk = detectDocumentRisk({ fileName: fileValue.name, content: textContent || undefined });
  if (risk) redirectMessage("error", risk);

  const checksum = sha256(bytes);
  const documentId = randomUUID();
  const cleanName = safeFileName(fileValue.name);
  const storagePath = `${membership.workspaceId}/${projectId ?? "global"}/${documentId}/${cleanName}`;
  const title = (inputResult.data.title || fileValue.name).trim().slice(0, 180);

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    workspace_id: membership.workspaceId,
    project_id: projectId,
    agent_id: null,
    conversation_id: null,
    scope_type: inputResult.data.scopeType,
    title,
    source_type: "upload",
    file_name: fileValue.name,
    mime_type: fileValue.type || "application/octet-stream",
    file_extension: extension || null,
    size_bytes: fileValue.size,
    storage_bucket: "nexus-memory",
    storage_path: storagePath,
    language: extension || null,
    checksum,
    status: "processing",
    extraction_status: indexable ? "pending" : "skipped",
    embedding_status: indexable ? "pending" : "skipped",
    created_by: user.id,
    updated_by: user.id,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      redirectMessage("error", "Este archivo ya existe dentro del mismo alcance de memoria.");
    }
    redirectMessage("error", `No pudimos registrar el documento: ${insertError.message}`);
  }

  const { error: storageError } = await supabase.storage
    .from("nexus-memory")
    .upload(storagePath, bytes, {
      contentType: fileValue.type || "application/octet-stream",
      upsert: false,
    });
  if (storageError) {
    await supabase
      .from("documents")
      .update({
        status: "failed",
        extraction_status: "failed",
        embedding_status: "failed",
        error_message: storageError.message,
        updated_by: user.id,
      })
      .eq("id", documentId);
    redirectMessage("error", `No pudimos guardar el archivo original: ${storageError.message}`);
  }

  if (!indexable) {
    await supabase
      .from("documents")
      .update({
        status: "stored_unindexed",
        error_message:
          fileValue.type === "application/pdf" || extension === "pdf"
            ? "El PDF se conservó, pero la extracción segura de texto llegará en un bloque posterior."
            : "El formato se conservó sin indexar porque no es texto UTF-8 compatible.",
        updated_by: user.id,
      })
      .eq("id", documentId);
    revalidatePath("/app/memoria");
    redirectMessage("success", "El archivo se guardó de forma privada, pero todavía no fue indexado.");
  }

  const chunks = chunkDocument(textContent);
  if (!chunks.length) {
    await supabase
      .from("documents")
      .update({
        status: "failed",
        extraction_status: "failed",
        embedding_status: "skipped",
        error_message: "El archivo no contiene texto indexable.",
        updated_by: user.id,
      })
      .eq("id", documentId);
    redirectMessage("error", "El archivo no contiene texto indexable.");
  }

  const { data: chunkRows, error: chunkError } = await supabase
    .from("document_chunks")
    .insert(
      chunks.map((chunk) => ({
        workspace_id: membership.workspaceId,
        document_id: documentId,
        project_id: projectId,
        agent_id: null,
        conversation_id: null,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_estimate: chunk.tokenEstimate,
        checksum: chunk.checksum,
        metadata: chunk.metadata,
      })),
    )
    .select("id, checksum, content, chunk_index");

  if (chunkError || !chunkRows) {
    await supabase
      .from("documents")
      .update({
        status: "failed",
        extraction_status: "failed",
        embedding_status: "failed",
        error_message: chunkError?.message ?? "No se pudieron crear fragmentos.",
        updated_by: user.id,
      })
      .eq("id", documentId);
    redirectMessage("error", "El archivo se guardó, pero no pudimos fragmentarlo.");
  }

  const typedChunkRows = chunkRows as Array<{
    id: string;
    checksum: string;
    content: string;
    chunk_index: number;
  }>;
  let embeddingStatus: "completed" | "skipped" | "failed" = "skipped";
  try {
    const embedded = await generateEmbeddings({
      supabase,
      workspaceId: membership.workspaceId,
      texts: typedChunkRows.map((row) => row.content),
    });
    if (embedded) {
      const { error: embeddingInsertError } = await supabase
        .from("memory_embeddings")
        .insert(
          typedChunkRows.map((row, index) => ({
            workspace_id: membership.workspaceId,
            project_id: projectId,
            document_chunk_id: row.id,
            memory_id: null,
            provider_id: embedded.providerId,
            model_id: embedded.modelId,
            dimensions: 1536,
            embedding: vectorLiteral(embedded.vectors[index] ?? []),
            content_checksum: row.checksum,
          })),
        );
      embeddingStatus = embeddingInsertError ? "failed" : "completed";
    }
  } catch {
    embeddingStatus = "failed";
  }

  await supabase
    .from("documents")
    .update({
      status: "ready",
      extraction_status: "completed",
      embedding_status: embeddingStatus,
      chunk_count: typedChunkRows.length,
      error_message:
        embeddingStatus === "failed"
          ? "La indexación textual está disponible; los embeddings no pudieron generarse."
          : null,
      updated_by: user.id,
    })
    .eq("id", documentId);

  revalidatePath("/app/memoria");
  revalidatePath("/app/conversaciones");
  redirectMessage(
    "success",
    embeddingStatus === "completed"
      ? `Documento indexado en ${typedChunkRows.length} fragmentos con búsqueda semántica.`
      : `Documento indexado en ${typedChunkRows.length} fragmentos con búsqueda textual.`,
  );
}

export async function createMemory(formData: FormData) {
  const result = createMemorySchema.safeParse({
    scopeType: textValue(formData, "scopeType"),
    projectId: textValue(formData, "projectId"),
    agentId: textValue(formData, "agentId"),
    conversationId: textValue(formData, "conversationId"),
    memoryType: textValue(formData, "memoryType"),
    title: textValue(formData, "title"),
    content: textValue(formData, "content"),
    importance: textValue(formData, "importance") || "50",
  });
  if (!result.success) redirectMessage("error", firstIssue(result.error));

  const { supabase, user, membership } = await requireCurrentWorkspace();
  const projectId =
    result.data.scopeType === "global" ? null : result.data.projectId;
  if (!(await validateProject(supabase, membership.workspaceId, projectId))) {
    redirectMessage("error", "El proyecto seleccionado no está disponible.");
  }

  const checksum = sha256(`${result.data.title}\n${result.data.content}`);
  const { data: memory, error } = await supabase
    .from("memories")
    .insert({
      workspace_id: membership.workspaceId,
      project_id: projectId,
      agent_id: result.data.agentId,
      conversation_id: result.data.conversationId,
      scope_type: result.data.scopeType,
      memory_type: result.data.memoryType,
      title: result.data.title,
      content: result.data.content,
      importance: result.data.importance,
      status: "active",
      checksum,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !memory) {
    redirectMessage(
      "error",
      error?.code === "23505"
        ? "Ya existe una memoria equivalente dentro de este alcance."
        : `No pudimos guardar la memoria: ${error?.message ?? "error desconocido"}`,
    );
  }

  try {
    const embedded = await generateEmbeddings({
      supabase,
      workspaceId: membership.workspaceId,
      texts: [`${result.data.title}\n${result.data.content}`],
    });
    if (embedded?.vectors[0]) {
      await supabase.from("memory_embeddings").insert({
        workspace_id: membership.workspaceId,
        project_id: projectId,
        document_chunk_id: null,
        memory_id: memory.id,
        provider_id: embedded.providerId,
        model_id: embedded.modelId,
        dimensions: 1536,
        embedding: vectorLiteral(embedded.vectors[0]),
        content_checksum: checksum,
      });
    }
  } catch {
    // La memoria permanece disponible para búsqueda textual.
  }

  revalidatePath("/app/memoria");
  redirectMessage("success", "La memoria fue guardada y ya puede utilizarse como contexto.");
}

export async function setMemoryStatus(formData: FormData) {
  const idResult = memoryIdSchema.safeParse(textValue(formData, "memoryId"));
  const statusResult = memoryStatusSchema.safeParse(textValue(formData, "status"));
  if (!idResult.success || !statusResult.success) {
    redirectMessage("error", "No pudimos actualizar la memoria seleccionada.");
  }
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("memories")
    .update({
      status: statusResult.data,
      archived_at: statusResult.data === "archived" ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .select("id")
    .maybeSingle();
  if (error || !data) redirectMessage("error", "No pudimos actualizar la memoria.");
  revalidatePath("/app/memoria");
  redirectMessage("success", "El estado de la memoria fue actualizado.");
}

export async function setDocumentStatus(formData: FormData) {
  const idResult = documentIdSchema.safeParse(textValue(formData, "documentId"));
  const status = textValue(formData, "status");
  if (!idResult.success || !["archived", "restore"].includes(status)) {
    redirectMessage("error", "No pudimos actualizar el documento seleccionado.");
  }
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data: current } = await supabase
    .from("documents")
    .select("id, chunk_count, extraction_status")
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .maybeSingle();
  if (!current) redirectMessage("error", "No encontramos ese documento.");

  const nextStatus =
    status === "archived"
      ? "archived"
      : current.chunk_count > 0 && current.extraction_status === "completed"
        ? "ready"
        : "stored_unindexed";
  const { error } = await supabase
    .from("documents")
    .update({
      status: nextStatus,
      archived_at: nextStatus === "archived" ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data);
  if (error) redirectMessage("error", "No pudimos actualizar el documento.");
  revalidatePath("/app/memoria");
  redirectMessage("success", "El estado del documento fue actualizado.");
}
