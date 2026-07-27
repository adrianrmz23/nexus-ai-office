"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";
import {
  parseTechnologyTags,
  technologyFormSchema,
  technologyIdSchema,
  type TechnologyFormInput,
} from "@/modules/technologies/domain/technology-schema";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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

function parseTechnologyForm(formData: FormData) {
  return technologyFormSchema.safeParse({
    name: textValue(formData, "name"),
    category: textValue(formData, "category"),
    description: textValue(formData, "description"),
    icon: textValue(formData, "icon"),
    color: textValue(formData, "color"),
    version: textValue(formData, "version"),
    officialDocsUrl: textValue(formData, "officialDocsUrl"),
    tags: textValue(formData, "tags"),
    technicalPrompt: textValue(formData, "technicalPrompt"),
    status: textValue(formData, "status"),
  });
}

function technologyPayload(data: TechnologyFormInput) {
  return {
    name: data.name,
    slug: data.name,
    category: data.category,
    description: data.description,
    icon: data.icon,
    color: data.color.toLowerCase(),
    version: data.version || null,
    official_docs_url: data.officialDocsUrl || null,
    tags: parseTechnologyTags(data.tags),
    technical_prompt: data.technicalPrompt,
    status: data.status,
  };
}

function databaseErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "Ya existe una tecnología con ese nombre dentro de la oficina.";
  }

  if (error.code === "42501") {
    return "No tienes permisos para modificar el catálogo técnico.";
  }

  return "No pudimos guardar la tecnología. Verifica la migración y vuelve a intentarlo.";
}

export async function createTechnology(formData: FormData) {
  const result = parseTechnologyForm(formData);

  if (!result.success) {
    redirectWithMessage(
      "/app/tecnologias/nueva",
      "error",
      firstIssue(result.error),
    );
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "Solo propietarios y administradores pueden crear tecnologías.",
    );
  }

  const { error } = await supabase.from("technologies").insert({
    workspace_id: membership.workspaceId,
    created_by: user.id,
    updated_by: user.id,
    ...technologyPayload(result.data),
  });

  if (error) {
    redirectWithMessage(
      "/app/tecnologias/nueva",
      "error",
      databaseErrorMessage(error),
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/tecnologias");
  redirectWithMessage(
    "/app/tecnologias",
    "success",
    "La tecnología fue agregada al catálogo.",
  );
}

export async function updateTechnology(formData: FormData) {
  const technologyIdResult = technologyIdSchema.safeParse(
    textValue(formData, "technologyId"),
  );
  const result = parseTechnologyForm(formData);
  const fallbackPath = technologyIdResult.success
    ? `/app/tecnologias/${technologyIdResult.data}/editar`
    : "/app/tecnologias";

  if (!technologyIdResult.success) {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "La tecnología seleccionada no es válida.",
    );
  }

  if (!result.success) {
    redirectWithMessage(fallbackPath, "error", firstIssue(result.error));
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "Solo propietarios y administradores pueden editar tecnologías.",
    );
  }

  const { data, error } = await supabase
    .from("technologies")
    .update({
      updated_by: user.id,
      ...technologyPayload(result.data),
    })
    .eq("id", technologyIdResult.data)
    .eq("workspace_id", membership.workspaceId)
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithMessage(fallbackPath, "error", databaseErrorMessage(error));
  }

  if (!data) {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "No encontramos esa tecnología dentro de tu oficina.",
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/tecnologias");
  revalidatePath(fallbackPath);
  redirectWithMessage(
    "/app/tecnologias",
    "success",
    "La tecnología fue actualizada.",
  );
}

export async function setTechnologyStatus(formData: FormData) {
  const technologyIdResult = technologyIdSchema.safeParse(
    textValue(formData, "technologyId"),
  );
  const statusResult = technologyFormSchema.shape.status.safeParse(
    textValue(formData, "status"),
  );

  if (!technologyIdResult.success || !statusResult.success) {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "No pudimos actualizar el estado de la tecnología.",
    );
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      "Solo propietarios y administradores pueden cambiar estados.",
    );
  }

  const { data, error } = await supabase
    .from("technologies")
    .update({
      status: statusResult.data,
      updated_by: user.id,
    })
    .eq("id", technologyIdResult.data)
    .eq("workspace_id", membership.workspaceId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectWithMessage(
      "/app/tecnologias",
      "error",
      error ? databaseErrorMessage(error) : "No encontramos esa tecnología.",
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/tecnologias");

  const message =
    statusResult.data === "archived"
      ? "La tecnología fue archivada."
      : statusResult.data === "active"
        ? "La tecnología está activa nuevamente."
        : "La tecnología fue marcada como inactiva.";

  redirectWithMessage("/app/tecnologias", "success", message);
}
