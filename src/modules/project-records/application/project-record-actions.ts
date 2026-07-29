"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  decisionSchema,
  errorSolutionSchema,
} from "@/modules/project-records/domain/project-record-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function redirectMessage(projectId: string, type: "error" | "success", message: string): never {
  redirect(`/app/proyectos/${projectId}/registro?${type}=${encodeURIComponent(message)}`);
}
function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos del registro.";
}

export async function createProjectDecision(formData: FormData) {
  const result = decisionSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
    context: textValue(formData, "context"),
    decision: textValue(formData, "decision"),
    consequences: textValue(formData, "consequences"),
    status: textValue(formData, "status"),
    conversationId: textValue(formData, "conversationId"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    agentId: textValue(formData, "agentId"),
  });
  const fallbackProject = textValue(formData, "projectId");
  if (!result.success) redirectMessage(fallbackProject, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { error } = await supabase.from("project_decisions").insert({
    workspace_id: membership.workspaceId,
    project_id: result.data.projectId,
    conversation_id: result.data.conversationId,
    source_message_id: result.data.sourceMessageId,
    decided_by_agent_id: result.data.agentId,
    title: result.data.title,
    context: result.data.context,
    decision: result.data.decision,
    consequences: result.data.consequences,
    status: result.data.status,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) redirectMessage(result.data.projectId, "error", error.message);
  revalidatePath(`/app/proyectos/${result.data.projectId}`);
  revalidatePath(`/app/proyectos/${result.data.projectId}/registro`);
  redirectMessage(result.data.projectId, "success", "La decisión técnica fue registrada.");
}

export async function createErrorSolution(formData: FormData) {
  const result = errorSolutionSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
    errorSignature: textValue(formData, "errorSignature"),
    symptoms: textValue(formData, "symptoms"),
    rootCause: textValue(formData, "rootCause"),
    solution: textValue(formData, "solution"),
    validationSteps: textValue(formData, "validationSteps"),
    status: textValue(formData, "status"),
    conversationId: textValue(formData, "conversationId"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    agentId: textValue(formData, "agentId"),
  });
  const fallbackProject = textValue(formData, "projectId");
  if (!result.success) redirectMessage(fallbackProject, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { error } = await supabase.from("error_solutions").insert({
    workspace_id: membership.workspaceId,
    project_id: result.data.projectId,
    conversation_id: result.data.conversationId,
    source_message_id: result.data.sourceMessageId,
    discovered_by_agent_id: result.data.agentId,
    title: result.data.title,
    error_signature: result.data.errorSignature,
    symptoms: result.data.symptoms,
    root_cause: result.data.rootCause,
    solution: result.data.solution,
    validation_steps: result.data.validationSteps,
    status: result.data.status,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) redirectMessage(result.data.projectId, "error", error.message);
  revalidatePath(`/app/proyectos/${result.data.projectId}`);
  revalidatePath(`/app/proyectos/${result.data.projectId}/registro`);
  redirectMessage(result.data.projectId, "success", "El error y su solución fueron registrados.");
}
