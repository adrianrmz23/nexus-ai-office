"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseProjectBudget,
  projectFormSchema,
  projectIdSchema,
  type ProjectFormInput,
} from "@/modules/projects/domain/project-schema";
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

function parseProjectForm(formData: FormData) {
  return projectFormSchema.safeParse({
    name: textValue(formData, "name"),
    clientName: textValue(formData, "clientName"),
    description: textValue(formData, "description"),
    icon: textValue(formData, "icon"),
    color: textValue(formData, "color"),
    status: textValue(formData, "status"),
    priority: textValue(formData, "priority"),
    repositoryUrl: textValue(formData, "repositoryUrl"),
    productionUrl: textValue(formData, "productionUrl"),
    stagingUrl: textValue(formData, "stagingUrl"),
    permanentInstructions: textValue(formData, "permanentInstructions"),
    projectRules: textValue(formData, "projectRules"),
    conventions: textValue(formData, "conventions"),
    budgetAmount: textValue(formData, "budgetAmount"),
    budgetCurrency: textValue(formData, "budgetCurrency"),
    technologyIds: stringValues(formData, "technologyIds"),
  });
}

function projectRpcPayload(data: ProjectFormInput) {
  return {
    p_name: data.name,
    p_client_name: data.clientName || null,
    p_description: data.description,
    p_icon: data.icon,
    p_color: data.color.toLowerCase(),
    p_status: data.status,
    p_priority: data.priority,
    p_repository_url: data.repositoryUrl || null,
    p_production_url: data.productionUrl || null,
    p_staging_url: data.stagingUrl || null,
    p_permanent_instructions: data.permanentInstructions,
    p_project_rules: data.projectRules,
    p_conventions: data.conventions,
    p_budget_amount: parseProjectBudget(data.budgetAmount),
    p_budget_currency: data.budgetCurrency,
    p_technology_ids: data.technologyIds,
  };
}

function databaseErrorMessage(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === "23505") {
    return "Ya existe un proyecto con ese nombre dentro de la oficina.";
  }

  if (error.code === "42501") {
    return "No tienes permisos para modificar proyectos.";
  }

  if (error.message.includes("unavailable")) {
    return "Una o más tecnologías seleccionadas ya no están disponibles.";
  }

  if (error.message.includes("permissions")) {
    return "Solo propietarios y administradores pueden modificar proyectos.";
  }

  if (error.message.includes("more than 30")) {
    return "Un proyecto puede utilizar como máximo 30 tecnologías.";
  }

  return "No pudimos guardar el proyecto. Verifica la migración y vuelve a intentarlo.";
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/proyectos");

  if (projectId) {
    revalidatePath(`/app/proyectos/${projectId}`);
    revalidatePath(`/app/proyectos/${projectId}/editar`);
  }
}

export async function createProject(formData: FormData) {
  const result = parseProjectForm(formData);

  if (!result.success) {
    redirectWithMessage("/app/proyectos/nuevo", "error", firstIssue(result.error));
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "Solo propietarios y administradores pueden crear proyectos.",
    );
  }

  const { data, error } = await supabase.rpc("create_project_record", {
    p_workspace_id: membership.workspaceId,
    ...projectRpcPayload(result.data),
  });

  if (error || typeof data !== "string") {
    redirectWithMessage(
      "/app/proyectos/nuevo",
      "error",
      error
        ? databaseErrorMessage(error)
        : "El proyecto no devolvió un identificador válido.",
    );
  }

  revalidateProjectPaths(data);
  redirectWithMessage(
    `/app/proyectos/${data}`,
    "success",
    "El proyecto fue creado y su contexto quedó preparado.",
  );
}

export async function updateProject(formData: FormData) {
  const projectIdResult = projectIdSchema.safeParse(
    textValue(formData, "projectId"),
  );
  const result = parseProjectForm(formData);
  const fallbackPath = projectIdResult.success
    ? `/app/proyectos/${projectIdResult.data}/editar`
    : "/app/proyectos";

  if (!projectIdResult.success) {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "El proyecto seleccionado no es válido.",
    );
  }

  if (!result.success) {
    redirectWithMessage(fallbackPath, "error", firstIssue(result.error));
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "Solo propietarios y administradores pueden editar proyectos.",
    );
  }

  const { data, error } = await supabase.rpc("update_project_record", {
    p_project_id: projectIdResult.data,
    ...projectRpcPayload(result.data),
  });

  if (error || typeof data !== "string") {
    redirectWithMessage(
      fallbackPath,
      "error",
      error
        ? databaseErrorMessage(error)
        : "No encontramos el proyecto que intentas modificar.",
    );
  }

  revalidateProjectPaths(data);
  redirectWithMessage(
    `/app/proyectos/${data}`,
    "success",
    "El proyecto fue actualizado.",
  );
}

export async function setProjectStatus(formData: FormData) {
  const projectIdResult = projectIdSchema.safeParse(
    textValue(formData, "projectId"),
  );
  const statusResult = projectFormSchema.shape.status.safeParse(
    textValue(formData, "status"),
  );
  const returnTo = textValue(formData, "returnTo");

  if (!projectIdResult.success || !statusResult.success) {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "No pudimos actualizar el estado del proyecto.",
    );
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      "Solo propietarios y administradores pueden cambiar estados.",
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      status: statusResult.data,
      updated_by: user.id,
    })
    .eq("id", projectIdResult.data)
    .eq("workspace_id", membership.workspaceId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectWithMessage(
      "/app/proyectos",
      "error",
      error ? databaseErrorMessage(error) : "No encontramos ese proyecto.",
    );
  }

  revalidateProjectPaths(projectIdResult.data);

  const message =
    statusResult.data === "archived"
      ? "El proyecto fue archivado."
      : statusResult.data === "active"
        ? "El proyecto está activo."
        : statusResult.data === "paused"
          ? "El proyecto fue pausado."
          : statusResult.data === "completed"
            ? "El proyecto fue marcado como completado."
            : "El proyecto volvió a planeación.";

  const safeReturnPath =
    returnTo === "detail"
      ? `/app/proyectos/${projectIdResult.data}`
      : "/app/proyectos";

  redirectWithMessage(safeReturnPath, "success", message);
}
