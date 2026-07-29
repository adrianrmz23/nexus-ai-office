"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  taskFormSchema,
  taskIdSchema,
  taskStatusSchema,
} from "@/modules/tasks/domain/task-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos de la tarea.";
}

function redirectMessage(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function parseTaskForm(formData: FormData) {
  return taskFormSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
    description: textValue(formData, "description"),
    acceptanceCriteria: textValue(formData, "acceptanceCriteria"),
    status: textValue(formData, "status"),
    priority: textValue(formData, "priority"),
    progress: textValue(formData, "progress") || "0",
    dueDate: textValue(formData, "dueDate"),
    assignedAgentId: textValue(formData, "assignedAgentId"),
    conversationId: textValue(formData, "conversationId"),
    sourceMessageId: textValue(formData, "sourceMessageId"),
    createdByAgentId: textValue(formData, "createdByAgentId"),
    dependencyIds: stringValues(formData, "dependencyIds"),
  });
}

function revalidateTaskPaths(taskId?: string, projectId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/tareas");
  revalidatePath("/app/artefactos");
  if (taskId) {
    revalidatePath(`/app/tareas/${taskId}`);
    revalidatePath(`/app/tareas/${taskId}/editar`);
  }
  if (projectId) revalidatePath(`/app/proyectos/${projectId}`);
}

export async function createTask(formData: FormData) {
  const result = parseTaskForm(formData);
  if (!result.success) redirectMessage("/app/tareas/nueva", "error", firstIssue(result.error));

  const { supabase, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("create_task_record", {
    p_workspace_id: membership.workspaceId,
    p_project_id: result.data.projectId,
    p_title: result.data.title,
    p_description: result.data.description,
    p_acceptance_criteria: result.data.acceptanceCriteria,
    p_status: result.data.status,
    p_priority: result.data.priority,
    p_progress: result.data.progress,
    p_due_date: result.data.dueDate,
    p_assigned_agent_id: result.data.assignedAgentId,
    p_conversation_id: result.data.conversationId,
    p_source_message_id: result.data.sourceMessageId,
    p_created_by_agent_id: result.data.createdByAgentId,
    p_dependency_ids: result.data.dependencyIds,
  });

  if (error || typeof data !== "string") {
    redirectMessage(
      "/app/tareas/nueva",
      "error",
      error?.message ?? "No pudimos crear la tarea.",
    );
  }
  revalidateTaskPaths(data, result.data.projectId);
  redirectMessage(`/app/tareas/${data}`, "success", "La tarea fue creada y vinculada al proyecto.");
}

export async function updateTask(formData: FormData) {
  const taskIdResult = taskIdSchema.safeParse(textValue(formData, "taskId"));
  const result = parseTaskForm(formData);
  const fallback = taskIdResult.success ? `/app/tareas/${taskIdResult.data}/editar` : "/app/tareas";
  if (!taskIdResult.success) redirectMessage("/app/tareas", "error", "La tarea seleccionada no es válida.");
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));

  const { supabase } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("update_task_record", {
    p_task_id: taskIdResult.data,
    p_title: result.data.title,
    p_description: result.data.description,
    p_acceptance_criteria: result.data.acceptanceCriteria,
    p_status: result.data.status,
    p_priority: result.data.priority,
    p_progress: result.data.progress,
    p_due_date: result.data.dueDate,
    p_assigned_agent_id: result.data.assignedAgentId,
    p_dependency_ids: result.data.dependencyIds,
  });
  if (error || typeof data !== "string") {
    redirectMessage(fallback, "error", error?.message ?? "No pudimos actualizar la tarea.");
  }
  revalidateTaskPaths(data, result.data.projectId);
  redirectMessage(`/app/tareas/${data}`, "success", "La tarea fue actualizada.");
}

export async function setTaskStatus(formData: FormData) {
  const idResult = taskIdSchema.safeParse(textValue(formData, "taskId"));
  const statusResult = taskStatusSchema.safeParse(textValue(formData, "status"));
  if (!idResult.success || !statusResult.success) {
    redirectMessage("/app/tareas", "error", "No pudimos cambiar el estado de la tarea.");
  }
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: statusResult.data, updated_by: user.id })
    .eq("workspace_id", membership.workspaceId)
    .eq("id", idResult.data)
    .select("id, project_id")
    .maybeSingle();
  if (error || !data) redirectMessage("/app/tareas", "error", error?.message ?? "No encontramos la tarea.");
  revalidateTaskPaths(data.id, data.project_id);
  redirectMessage(`/app/tareas/${data.id}`, "success", "El estado de la tarea fue actualizado.");
}
