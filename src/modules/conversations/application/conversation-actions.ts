"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  conversationIdSchema,
  createConversationSchema,
} from "@/modules/conversations/domain/conversation-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectMessage(
  path: string,
  type: "error" | "success",
  message: string,
): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

export async function createConversation(formData: FormData) {
  const result = createConversationSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    title: textValue(formData, "title"),
    mode: textValue(formData, "mode"),
    agentId: textValue(formData, "agentId"),
    modelId: textValue(formData, "modelId"),
  });

  if (!result.success) {
    redirectMessage("/app/conversaciones/nueva", "error", firstIssue(result.error));
  }

  const { supabase } = await requireCurrentWorkspace();
  const { data, error } = await supabase.rpc("create_conversation_record", {
    p_project_id: result.data.projectId,
    p_title: result.data.title,
    p_mode: result.data.mode,
    p_agent_id: result.data.agentId,
    p_model_id: result.data.modelId,
  });

  if (error || !data) {
    redirectMessage(
      "/app/conversaciones/nueva",
      "error",
      error?.message || "No pudimos crear la conversación.",
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/conversaciones");
  redirect(`/app/conversaciones/${data}`);
}

export async function setConversationStatus(formData: FormData) {
  const idResult = conversationIdSchema.safeParse(textValue(formData, "conversationId"));
  const status = textValue(formData, "status");
  if (!idResult.success || !["active", "archived"].includes(status)) {
    redirectMessage("/app/conversaciones", "error", "La conversación no es válida.");
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { error } = await supabase
    .from("conversations")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
      updated_by: user.id,
    })
    .eq("id", idResult.data)
    .eq("workspace_id", membership.workspaceId);

  if (error) {
    redirectMessage(
      "/app/conversaciones",
      "error",
      "No pudimos actualizar la conversación.",
    );
  }

  revalidatePath("/app/conversaciones");
  redirectMessage(
    "/app/conversaciones",
    "success",
    status === "archived"
      ? "La conversación fue archivada."
      : "La conversación fue restaurada.",
  );
}
