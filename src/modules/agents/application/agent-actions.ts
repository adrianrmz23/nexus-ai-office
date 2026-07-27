"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  agentFormSchema,
  agentIdSchema,
  parseModelKeys,
  projectAgentIdSchema,
  type AgentFormInput,
} from "@/modules/agents/domain/agent-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function stringValues(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

function redirectWithMessage(
  pathname: string,
  type: "error" | "success",
  message: string,
): never {
  redirect(`${pathname}?${type}=${encodeURIComponent(message)}`);
}

function parseAgentForm(formData: FormData) {
  return agentFormSchema.safeParse({
    name: textValue(formData, "name"),
    description: textValue(formData, "description"),
    role: textValue(formData, "role"),
    scope: textValue(formData, "scope"),
    icon: textValue(formData, "icon"),
    color: textValue(formData, "color"),
    avatarUrl: textValue(formData, "avatarUrl"),
    instructions: textValue(formData, "instructions"),
    preferredModelKey: textValue(formData, "preferredModelKey"),
    alternativeModelKeys: textValue(formData, "alternativeModelKeys"),
    creativity: textValue(formData, "creativity"),
    memoryEnabled: formData.get("memoryEnabled") === "on",
    allowedTools: stringValues(formData, "allowedTools"),
    escalationRules: textValue(formData, "escalationRules"),
    status: textValue(formData, "status"),
    technologyIds: stringValues(formData, "technologyIds"),
    collaboratorIds: stringValues(formData, "collaboratorIds"),
  });
}

function agentRpcPayload(data: AgentFormInput) {
  return {
    p_name: data.name,
    p_description: data.description,
    p_role: data.role,
    p_scope: data.scope,
    p_icon: data.icon,
    p_color: data.color.toLowerCase(),
    p_avatar_url: data.avatarUrl || null,
    p_instructions: data.instructions,
    p_preferred_model_key: data.preferredModelKey || null,
    p_alternative_model_keys: parseModelKeys(data.alternativeModelKeys),
    p_creativity: data.creativity,
    p_memory_enabled: data.memoryEnabled,
    p_allowed_tools: data.allowedTools,
    p_escalation_rules: data.escalationRules,
    p_status: data.status,
    p_technology_ids: data.technologyIds,
    p_collaborator_ids: data.collaboratorIds,
  };
}

function databaseErrorMessage(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23505") {
    return "Ya existe un agente con ese nombre dentro de la oficina.";
  }

  if (error.code === "42501") {
    return "No tienes permisos para modificar agentes.";
  }

  if (error.message.includes("technology")) {
    return "Una o más tecnologías seleccionadas no están disponibles.";
  }

  if (error.message.includes("collaborator")) {
    return "Uno o más colaboradores no están disponibles o pertenecen a otra oficina.";
  }

  if (error.message.includes("permissions")) {
    return "Solo propietarios y administradores pueden realizar esta acción.";
  }

  if (error.message.includes("project")) {
    return "No pudimos validar el proyecto seleccionado.";
  }

  return "No pudimos completar la operación. Verifica la migración del Bloque 04 y vuelve a intentarlo.";
}

function revalidateAgentPaths(agentId?: string, projectId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/agentes");
  revalidatePath("/app/proyectos");

  if (agentId) {
    revalidatePath(`/app/agentes/${agentId}`);
    revalidatePath(`/app/agentes/${agentId}/editar`);
  }

  if (projectId) {
    revalidatePath(`/app/proyectos/${projectId}`);
    revalidatePath(`/app/proyectos/${projectId}/agentes`);
  }
}

export async function createAgent(formData: FormData) {
  const result = parseAgentForm(formData);

  if (!result.success) {
    redirectWithMessage("/app/agentes/nuevo", "error", firstIssue(result.error));
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/agentes",
      "error",
      "Solo propietarios y administradores pueden crear agentes.",
    );
  }

  const { data, error } = await supabase.rpc("create_agent_record", {
    p_workspace_id: membership.workspaceId,
    ...agentRpcPayload(result.data),
  });

  if (error || typeof data !== "string") {
    redirectWithMessage(
      "/app/agentes/nuevo",
      "error",
      error
        ? databaseErrorMessage(error)
        : "El agente no devolvió un identificador válido.",
    );
  }

  revalidateAgentPaths(data);
  redirectWithMessage(
    `/app/agentes/${data}`,
    "success",
    "El agente fue creado y su especialización quedó configurada.",
  );
}

export async function updateAgent(formData: FormData) {
  const agentIdResult = agentIdSchema.safeParse(textValue(formData, "agentId"));
  const result = parseAgentForm(formData);
  const fallbackPath = agentIdResult.success
    ? `/app/agentes/${agentIdResult.data}/editar`
    : "/app/agentes";

  if (!agentIdResult.success) {
    redirectWithMessage("/app/agentes", "error", "El agente no es válido.");
  }

  if (!result.success) {
    redirectWithMessage(fallbackPath, "error", firstIssue(result.error));
  }

  if (result.data.collaboratorIds.includes(agentIdResult.data)) {
    redirectWithMessage(
      fallbackPath,
      "error",
      "Un agente no puede registrarse como su propio colaborador.",
    );
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/agentes",
      "error",
      "Solo propietarios y administradores pueden editar agentes.",
    );
  }

  const { data, error } = await supabase.rpc("update_agent_record", {
    p_agent_id: agentIdResult.data,
    ...agentRpcPayload(result.data),
  });

  if (error || typeof data !== "string") {
    redirectWithMessage(
      fallbackPath,
      "error",
      error
        ? databaseErrorMessage(error)
        : "No encontramos el agente que intentas modificar.",
    );
  }

  revalidateAgentPaths(data);
  redirectWithMessage(
    `/app/agentes/${data}`,
    "success",
    "El agente fue actualizado.",
  );
}

export async function setAgentStatus(formData: FormData) {
  const agentIdResult = agentIdSchema.safeParse(textValue(formData, "agentId"));
  const statusResult = agentFormSchema.shape.status.safeParse(
    textValue(formData, "status"),
  );

  if (!agentIdResult.success || !statusResult.success) {
    redirectWithMessage(
      "/app/agentes",
      "error",
      "No pudimos actualizar el estado del agente.",
    );
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/agentes",
      "error",
      "Solo propietarios y administradores pueden cambiar estados.",
    );
  }

  const { data, error } = await supabase
    .from("agents")
    .update({
      status: statusResult.data,
      updated_by: user.id,
    })
    .eq("id", agentIdResult.data)
    .eq("workspace_id", membership.workspaceId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectWithMessage(
      "/app/agentes",
      "error",
      error ? databaseErrorMessage(error) : "No encontramos ese agente.",
    );
  }

  revalidateAgentPaths(agentIdResult.data);

  const message =
    statusResult.data === "archived"
      ? "El agente fue archivado y retirado de los equipos activos."
      : statusResult.data === "inactive"
        ? "El agente fue desactivado."
        : "El agente está disponible nuevamente.";

  redirectWithMessage("/app/agentes", "success", message);
}

export async function assignAgentToProject(formData: FormData) {
  const projectIdResult = projectAgentIdSchema.safeParse(
    textValue(formData, "projectId"),
  );
  const agentIdResult = agentIdSchema.safeParse(textValue(formData, "agentId"));
  const isLead = formData.get("isLead") === "on";
  const reason = textValue(formData, "assignmentReason").trim().slice(0, 1200);

  if (!projectIdResult.success || !agentIdResult.success) {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "La asignación seleccionada no es válida.",
    );
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      "Solo propietarios y administradores pueden administrar equipos.",
    );
  }

  const { error } = await supabase.rpc("assign_project_agent", {
    p_project_id: projectIdResult.data,
    p_agent_id: agentIdResult.data,
    p_is_lead: isLead,
    p_assignment_reason: reason,
  });

  if (error) {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      databaseErrorMessage(error),
    );
  }

  revalidateAgentPaths(agentIdResult.data, projectIdResult.data);
  redirectWithMessage(
    `/app/proyectos/${projectIdResult.data}/agentes`,
    "success",
    "El agente fue asignado al proyecto.",
  );
}

export async function removeAgentFromProject(formData: FormData) {
  const projectIdResult = projectAgentIdSchema.safeParse(
    textValue(formData, "projectId"),
  );
  const agentIdResult = agentIdSchema.safeParse(textValue(formData, "agentId"));

  if (!projectIdResult.success || !agentIdResult.success) {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "La asignación seleccionada no es válida.",
    );
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      "Solo propietarios y administradores pueden administrar equipos.",
    );
  }

  const { error } = await supabase.rpc("remove_project_agent", {
    p_project_id: projectIdResult.data,
    p_agent_id: agentIdResult.data,
  });

  if (error) {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      databaseErrorMessage(error),
    );
  }

  revalidateAgentPaths(agentIdResult.data, projectIdResult.data);
  redirectWithMessage(
    `/app/proyectos/${projectIdResult.data}/agentes`,
    "success",
    "El agente fue retirado del equipo.",
  );
}

export async function assignSuggestedTeam(formData: FormData) {
  const projectIdResult = projectAgentIdSchema.safeParse(
    textValue(formData, "projectId"),
  );
  const agentIds = stringValues(formData, "agentIds");

  if (!projectIdResult.success || agentIds.length === 0) {
    redirectWithMessage(
      projectIdResult.success
        ? `/app/proyectos/${projectIdResult.data}/agentes`
        : "/app/proyectos",
      "error",
      "No hay agentes sugeridos disponibles para asignar.",
    );
  }

  const parsedAgentIds = agentIds.map((agentId) => agentIdSchema.safeParse(agentId));
  if (parsedAgentIds.some((result) => !result.success)) {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      "La recomendación contiene un agente no válido.",
    );
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      "Solo propietarios y administradores pueden administrar equipos.",
    );
  }

  const { data, error } = await supabase.rpc("assign_project_agents", {
    p_project_id: projectIdResult.data,
    p_agent_ids: agentIds,
    p_assignment_reason: "Equipo recomendado por coincidencia de rol y stack técnico.",
  });

  if (error) {
    redirectWithMessage(
      `/app/proyectos/${projectIdResult.data}/agentes`,
      "error",
      databaseErrorMessage(error),
    );
  }

  revalidateAgentPaths(undefined, projectIdResult.data);
  redirectWithMessage(
    `/app/proyectos/${projectIdResult.data}/agentes`,
    "success",
    `Se agregaron ${typeof data === "number" ? data : agentIds.length} agentes sugeridos.`,
  );
}
