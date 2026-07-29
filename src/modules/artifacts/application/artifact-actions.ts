"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  artifactFormSchema,
  artifactIdSchema,
  artifactReviewSchema,
  artifactVersionSchema,
} from "@/modules/artifacts/domain/artifact-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos del artefacto.";
}
function redirectMessage(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}
function revalidateArtifactPaths(artifactId?: string, projectId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/artefactos");
  revalidatePath("/app/tareas");
  if (artifactId) revalidatePath(`/app/artefactos/${artifactId}`);
  if (projectId) revalidatePath(`/app/proyectos/${projectId}`);
}

export async function createArtifact(formData: FormData) {
  const result = artifactFormSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
    artifactType: textValue(formData, "artifactType"),
    language: textValue(formData, "language"),
    filePath: textValue(formData, "filePath"),
    content: textValue(formData, "content"),
    changeSummary: textValue(formData, "changeSummary"),
    taskId: textValue(formData, "taskId"),
    conversationId: textValue(formData, "conversationId"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    createdByAgentId: textValue(formData, "createdByAgentId"),
  });
  if (!result.success) redirectMessage("/app/artefactos/nuevo", "error", firstIssue(result.error));
  const { supabase, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("create_artifact_record", {
    p_workspace_id: membership.workspaceId,
    p_project_id: result.data.projectId,
    p_title: result.data.title,
    p_artifact_type: result.data.artifactType,
    p_language: result.data.language,
    p_file_path: result.data.filePath,
    p_content: result.data.content,
    p_change_summary: result.data.changeSummary,
    p_task_id: result.data.taskId,
    p_conversation_id: result.data.conversationId,
    p_source_message_id: result.data.sourceMessageId,
    p_created_by_agent_id: result.data.createdByAgentId,
  });
  if (error || typeof data !== "string") {
    redirectMessage("/app/artefactos/nuevo", "error", error?.message ?? "No pudimos crear el artefacto.");
  }
  revalidateArtifactPaths(data, result.data.projectId);
  redirectMessage(`/app/artefactos/${data}`, "success", "El artefacto y su primera versión fueron guardados.");
}

export async function createArtifactVersion(formData: FormData) {
  const result = artifactVersionSchema.safeParse({
    artifactId: textValue(formData, "artifactId"),
    content: textValue(formData, "content"),
    changeSummary: textValue(formData, "changeSummary"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    createdByAgentId: textValue(formData, "createdByAgentId"),
  });
  if (!result.success) redirectMessage("/app/artefactos", "error", firstIssue(result.error));
  const { supabase, membership } = await requireCurrentWorkspace();
  const { data: artifact } = await supabase.from("artifacts").select("project_id").eq("workspace_id", membership.workspaceId).eq("id", result.data.artifactId).maybeSingle();
  const { data, error } = await supabase.rpc("create_artifact_version", {
    p_artifact_id: result.data.artifactId,
    p_content: result.data.content,
    p_change_summary: result.data.changeSummary,
    p_source_message_id: result.data.sourceMessageId,
    p_created_by_agent_id: result.data.createdByAgentId,
  });
  if (error || typeof data !== "number") {
    redirectMessage(`/app/artefactos/${result.data.artifactId}`, "error", error?.message ?? "No pudimos crear la versión.");
  }
  revalidateArtifactPaths(result.data.artifactId, artifact?.project_id);
  redirectMessage(`/app/artefactos/${result.data.artifactId}`, "success", `La versión ${data} fue creada.`);
}

export async function reviewArtifact(formData: FormData) {
  const result = artifactReviewSchema.safeParse({
    artifactId: textValue(formData, "artifactId"),
    status: textValue(formData, "status"),
    reviewNote: textValue(formData, "reviewNote"),
    reviewerAgentId: textValue(formData, "reviewerAgentId"),
  });
  if (!result.success) redirectMessage("/app/artefactos", "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("artifacts")
    .update({
      status: result.data.status,
      review_note: result.data.reviewNote,
      reviewer_agent_id: result.data.reviewerAgentId,
      updated_by: user.id,
    })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", result.data.artifactId)
    .select("id, project_id")
    .maybeSingle();
  if (error || !data) redirectMessage("/app/artefactos", "error", error?.message ?? "No encontramos el artefacto.");
  revalidateArtifactPaths(data.id, data.project_id);
  redirectMessage(`/app/artefactos/${data.id}`, "success", "La revisión del artefacto fue registrada.");
}

export async function archiveArtifact(formData: FormData) {
  const idResult = artifactIdSchema.safeParse(textValue(formData, "artifactId"));
  if (!idResult.success) redirectMessage("/app/artefactos", "error", "El artefacto no es válido.");
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("artifacts")
    .update({ status: "archived", updated_by: user.id })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .select("id, project_id")
    .maybeSingle();
  if (error || !data) redirectMessage("/app/artefactos", "error", error?.message ?? "No encontramos el artefacto.");
  revalidateArtifactPaths(data.id, data.project_id);
  redirectMessage("/app/artefactos", "success", "El artefacto fue archivado sin perder sus versiones.");
}
