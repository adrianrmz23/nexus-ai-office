"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AIProviderType, ProviderModelDescriptor } from "@/core/ai/contracts";
import { createProviderAdapter } from "@/infrastructure/ai/provider-registry";
import { decryptCredential, encryptCredential } from "@/lib/security/credential-crypto";
import { consumeRateLimit, recordSecurityEvent } from "@/lib/security/rate-limit";
import { MODEL_TASK_TYPES } from "@/modules/models/domain/model";
import {
  modelFormSchema,
  modelPreferenceSchema,
  providerCredentialSchema,
  providerSettingsSchema,
  uuidSchema,
} from "@/modules/models/domain/model-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function stringValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}
function redirectMessage(path: string, type: "error" | "success", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${type}=${encodeURIComponent(message)}`);
}
function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}
function assertCanManage(role: "owner" | "admin" | "member", returnTo: string): void {
  if (role === "member") {
    redirectMessage(returnTo, "error", "Solo propietarios y administradores pueden modificar proveedores y modelos.");
  }
}
function nullableBoolean(formData: FormData, key: string): boolean | null {
  const value = textValue(formData, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}
function nullableScore(formData: FormData, key: string): number | null {
  const value = textValue(formData, key).trim();
  return value ? Number(value) : null;
}
function revalidateModelPaths(providerId?: string, modelId?: string): void {
  revalidatePath("/app");
  revalidatePath("/app/modelos");
  revalidatePath("/app/modelos/recomendador");
  revalidatePath("/app/agentes");
  revalidatePath("/app/proyectos");
  if (providerId) revalidatePath(`/app/modelos/proveedores/${providerId}`);
  if (modelId) revalidatePath(`/app/modelos/${modelId}/editar`);
}

async function getProviderWithCredential(providerId: string) {
  const context = await requireCurrentWorkspace();
  assertCanManage(context.membership.role, `/app/modelos/proveedores/${providerId}`);
  const { data: provider } = await context.supabase
    .from("ai_providers")
    .select("id, workspace_id, provider_type, base_url, display_name")
    .eq("id", providerId)
    .eq("workspace_id", context.membership.workspaceId)
    .maybeSingle();
  if (!provider) redirectMessage("/app/modelos", "error", "No encontramos el proveedor seleccionado.");
  const { data: credentialRows, error } = await context.supabase.rpc("get_provider_credential", {
    p_provider_id: providerId,
  });
  const credential = Array.isArray(credentialRows) ? credentialRows[0] : null;
  if (error || !credential) {
    redirectMessage(`/app/modelos/proveedores/${providerId}`, "error", "Primero guarda una clave API para este proveedor.");
  }
  let apiKey: string;
  try {
    apiKey = decryptCredential({
      ciphertext: credential.ciphertext,
      iv: credential.iv,
      authTag: credential.auth_tag,
      keyVersion: credential.key_version,
    });
  } catch (error) {
    redirectMessage(
      `/app/modelos/proveedores/${providerId}`,
      "error",
      error instanceof Error ? error.message : "No pudimos descifrar la credencial.",
    );
  }
  return { ...context, provider, apiKey };
}

async function enforceProviderRateLimit(input: {
  context: Awaited<ReturnType<typeof getProviderWithCredential>>;
  actionKey: string;
  limit: number;
  windowSeconds: number;
}) {
  let result;
  try {
    result = await consumeRateLimit({
      supabase: input.context.supabase,
      workspaceId: input.context.membership.workspaceId,
      actionKey: input.actionKey,
      limit: input.limit,
      windowSeconds: input.windowSeconds,
    });
  } catch (error) {
    redirectMessage(
      `/app/modelos/proveedores/${input.context.provider.id}`,
      "error",
      error instanceof Error
        ? error.message
        : "No pudimos validar el límite operativo.",
    );
  }

  if (!result.allowed) {
    await recordSecurityEvent({
      supabase: input.context.supabase,
      workspaceId: input.context.membership.workspaceId,
      eventType: "rate_limit.provider_blocked",
      severity: "warning",
      source: "model_management",
      metadata: {
        providerId: input.context.provider.id,
        actionKey: input.actionKey,
        retryAfterSeconds: result.retryAfterSeconds,
      },
    });

    redirectMessage(
      `/app/modelos/proveedores/${input.context.provider.id}`,
      "error",
      `Espera ${result.retryAfterSeconds} segundos antes de repetir esta operación.`,
    );
  }
}

export async function updateProviderSettings(formData: FormData) {
  const result = providerSettingsSchema.safeParse({
    providerId: textValue(formData, "providerId"),
    displayName: textValue(formData, "displayName"),
    baseUrl: textValue(formData, "baseUrl"),
    status: textValue(formData, "status"),
    notes: textValue(formData, "notes"),
  });
  const fallback = `/app/modelos/proveedores/${textValue(formData, "providerId")}`;
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  const { error } = await supabase
    .from("ai_providers")
    .update({
      display_name: result.data.displayName,
      base_url: result.data.baseUrl.replace(/\/+$/, ""),
      status: result.data.status,
      notes: result.data.notes,
      health_status: "unchecked",
      updated_by: user.id,
    })
    .eq("id", result.data.providerId)
    .eq("workspace_id", membership.workspaceId);
  if (error) redirectMessage(fallback, "error", "No pudimos actualizar el proveedor.");
  revalidateModelPaths(result.data.providerId);
  redirectMessage(fallback, "success", "La configuración del proveedor fue actualizada.");
}

export async function saveProviderCredential(formData: FormData) {
  const result = providerCredentialSchema.safeParse({
    providerId: textValue(formData, "providerId"),
    apiKey: textValue(formData, "apiKey"),
  });
  const fallback = `/app/modelos/proveedores/${textValue(formData, "providerId")}`;
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  let encrypted: ReturnType<typeof encryptCredential>;
  try {
    encrypted = encryptCredential(result.data.apiKey);
  } catch (error) {
    redirectMessage(fallback, "error", error instanceof Error ? error.message : "No pudimos cifrar la credencial.");
  }
  const { error } = await supabase.rpc("save_provider_credential", {
    p_provider_id: result.data.providerId,
    p_ciphertext: encrypted.ciphertext,
    p_iv: encrypted.iv,
    p_auth_tag: encrypted.authTag,
    p_last_four: result.data.apiKey.slice(-4),
    p_key_version: encrypted.keyVersion,
  });
  if (error) redirectMessage(fallback, "error", "No pudimos guardar la credencial cifrada.");
  revalidateModelPaths(result.data.providerId);
  redirectMessage(fallback, "success", "La credencial quedó cifrada. Ahora puedes probar la conexión.");
}

export async function deleteProviderCredential(formData: FormData) {
  const parsed = uuidSchema.safeParse(textValue(formData, "providerId"));
  if (!parsed.success) redirectMessage("/app/modelos", "error", "El proveedor no es válido.");
  const fallback = `/app/modelos/proveedores/${parsed.data}`;
  const { supabase, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  const { error } = await supabase.rpc("delete_provider_credential", { p_provider_id: parsed.data });
  if (error) redirectMessage(fallback, "error", "No pudimos eliminar la credencial.");
  revalidateModelPaths(parsed.data);
  redirectMessage(fallback, "success", "La credencial fue eliminada del proveedor.");
}

export async function testProviderConnection(formData: FormData) {
  const parsed = uuidSchema.safeParse(textValue(formData, "providerId"));
  if (!parsed.success) redirectMessage("/app/modelos", "error", "El proveedor no es válido.");
  const context = await getProviderWithCredential(parsed.data);
  await enforceProviderRateLimit({
    context,
    actionKey: "provider:test",
    limit: 10,
    windowSeconds: 600,
  });
  const adapter = createProviderAdapter({
    type: context.provider.provider_type as AIProviderType,
    baseUrl: context.provider.base_url,
    apiKey: context.apiKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
  const health = await adapter.validateCredentials();
  const now = new Date().toISOString();
  const [checkResult, providerResult] = await Promise.all([
    context.supabase.from("provider_health_checks").insert({
      workspace_id: context.membership.workspaceId,
      provider_id: context.provider.id,
      status: health.status,
      response_time_ms: health.responseTimeMs,
      model_count: health.modelCount,
      error_code: health.errorCode,
      error_message: health.errorMessage,
      checked_by: context.user.id,
    }),
    context.supabase
      .from("ai_providers")
      .update({
        health_status: health.status,
        last_checked_at: now,
        last_error: health.errorMessage,
        updated_by: context.user.id,
      })
      .eq("id", context.provider.id)
      .eq("workspace_id", context.membership.workspaceId),
  ]);
  if (checkResult.error || providerResult.error) {
    redirectMessage(`/app/modelos/proveedores/${context.provider.id}`, "error", "La prueba terminó, pero no pudimos registrar su resultado.");
  }
  revalidateModelPaths(context.provider.id);
  if (health.status === "error") {
    redirectMessage(`/app/modelos/proveedores/${context.provider.id}`, "error", `La conexión falló: ${health.errorMessage ?? "respuesta no válida"}`);
  }
  redirectMessage(`/app/modelos/proveedores/${context.provider.id}`, "success", `Conexión correcta. El proveedor reportó ${health.modelCount ?? 0} modelos.`);
}

function normalizedModelRow(
  descriptor: ProviderModelDescriptor,
  input: { workspaceId: string; providerId: string; userId: string },
) {
  return {
    workspace_id: input.workspaceId,
    provider_id: input.providerId,
    display_name: descriptor.displayName.slice(0, 160),
    api_identifier: descriptor.apiIdentifier.slice(0, 220),
    model_kind: descriptor.modelKind,
    status: "active",
    context_window: descriptor.contextWindow,
    max_output_tokens: descriptor.maxOutputTokens,
    input_cost_per_million: descriptor.inputCostPerMillion,
    output_cost_per_million: descriptor.outputCostPerMillion,
    currency: "USD",
    last_synced_at: new Date().toISOString(),
    source_metadata: descriptor.sourceMetadata,
    created_by: input.userId,
    updated_by: input.userId,
  };
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function syncProviderModels(formData: FormData) {
  const parsed = uuidSchema.safeParse(textValue(formData, "providerId"));
  if (!parsed.success) {
    redirectMessage("/app/modelos", "error", "El proveedor no es válido.");
  }

  const context = await getProviderWithCredential(parsed.data);
  await enforceProviderRateLimit({
    context,
    actionKey: "provider:sync",
    limit: 6,
    windowSeconds: 600,
  });
  const adapter = createProviderAdapter({
    type: context.provider.provider_type as AIProviderType,
    baseUrl: context.provider.base_url,
    apiKey: context.apiKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });

  let descriptors: ProviderModelDescriptor[];
  try {
    descriptors = await adapter.listModels();
  } catch (error) {
    redirectMessage(
      `/app/modelos/proveedores/${context.provider.id}`,
      "error",
      error instanceof Error
        ? error.message
        : "No pudimos sincronizar modelos.",
    );
  }

  const uniqueDescriptors = [
    ...new Map(
      descriptors.map((descriptor) => [descriptor.apiIdentifier, descriptor]),
    ).values(),
  ];

  if (!uniqueDescriptors.length) {
    redirectMessage(
      `/app/modelos/proveedores/${context.provider.id}`,
      "error",
      "El proveedor no devolvió modelos disponibles.",
    );
  }

  const syncTimestamp = new Date().toISOString();
  const rows = uniqueDescriptors.map((descriptor) => ({
    ...normalizedModelRow(descriptor, {
      workspaceId: context.membership.workspaceId,
      providerId: context.provider.id,
      userId: context.user.id,
    }),
    last_synced_at: syncTimestamp,
  }));

  const syncedModels: Array<{ id: string; api_identifier: string }> = [];

  for (const batch of chunkItems(rows, 100)) {
    const { data, error } = await context.supabase
      .from("ai_models")
      .upsert(batch, {
        onConflict: "provider_id,api_identifier",
        ignoreDuplicates: false,
      })
      .select("id, api_identifier");

    if (error || !data) {
      redirectMessage(
        `/app/modelos/proveedores/${context.provider.id}`,
        "error",
        error?.message
          ? `No pudimos guardar el catálogo sincronizado: ${error.message}`
          : "No pudimos guardar el catálogo sincronizado.",
      );
    }

    syncedModels.push(...data);
  }

  const descriptorsById = new Map(
    uniqueDescriptors.map((descriptor) => [descriptor.apiIdentifier, descriptor]),
  );
  const capabilityRows = syncedModels.map((model) => {
    const descriptor = descriptorsById.get(model.api_identifier);
    return {
      model_id: model.id,
      workspace_id: context.membership.workspaceId,
      supports_reasoning: descriptor?.capabilities.reasoning ?? null,
      supports_tools: descriptor?.capabilities.tools ?? null,
      supports_streaming: descriptor?.capabilities.streaming ?? null,
      supports_vision: descriptor?.capabilities.vision ?? null,
      supports_files: descriptor?.capabilities.files ?? null,
      supports_structured_output:
        descriptor?.capabilities.structuredOutput ?? null,
      supports_embeddings: descriptor?.capabilities.embeddings ?? null,
      created_by: context.user.id,
      updated_by: context.user.id,
    };
  });

  for (const batch of chunkItems(capabilityRows, 100)) {
    const { error } = await context.supabase
      .from("model_capabilities")
      .upsert(batch, { onConflict: "model_id" });

    if (error) {
      redirectMessage(
        `/app/modelos/proveedores/${context.provider.id}`,
        "error",
        `Los modelos se guardaron, pero no sus capacidades: ${error.message}`,
      );
    }
  }

  const [{ count: providerModelCount, error: countError }, providerResult] =
    await Promise.all([
      context.supabase
        .from("ai_models")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", context.membership.workspaceId)
        .eq("provider_id", context.provider.id),
      context.supabase
        .from("ai_providers")
        .update({
          health_status: "healthy",
          last_checked_at: syncTimestamp,
          last_error: null,
          updated_by: context.user.id,
        })
        .eq("id", context.provider.id)
        .eq("workspace_id", context.membership.workspaceId),
    ]);

  if (countError || providerResult.error) {
    redirectMessage(
      `/app/modelos/proveedores/${context.provider.id}`,
      "error",
      "Los modelos se sincronizaron, pero no pudimos verificar el catálogo final.",
    );
  }

  revalidateModelPaths(context.provider.id);
  redirectMessage(
    `/app/modelos?provider=${context.provider.id}`,
    "success",
    `Se sincronizaron ${syncedModels.length} modelos. El proveedor tiene ${providerModelCount ?? syncedModels.length} modelos registrados.`,
  );
}

function parseModelForm(formData: FormData) {
  const taskScores = Object.fromEntries(
    MODEL_TASK_TYPES.map((task) => [task, nullableScore(formData, `taskScore_${task}`)]),
  );
  const technologyScores: Record<string, number | null> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("technologyScore_")) continue;
    const technologyId = key.replace("technologyScore_", "");
    if (!uuidSchema.safeParse(technologyId).success || typeof value !== "string") continue;
    technologyScores[technologyId] = value.trim() ? Number(value) : null;
  }
  return modelFormSchema.safeParse({
    modelId: textValue(formData, "modelId") || undefined,
    providerId: textValue(formData, "providerId"),
    displayName: textValue(formData, "displayName"),
    apiIdentifier: textValue(formData, "apiIdentifier"),
    modelKind: textValue(formData, "modelKind"),
    status: textValue(formData, "status"),
    contextWindow: textValue(formData, "contextWindow"),
    maxOutputTokens: textValue(formData, "maxOutputTokens"),
    inputCostPerMillion: textValue(formData, "inputCostPerMillion"),
    outputCostPerMillion: textValue(formData, "outputCostPerMillion"),
    currency: textValue(formData, "currency"),
    pricingNotes: textValue(formData, "pricingNotes"),
    lastReviewedAt: textValue(formData, "lastReviewedAt"),
    notes: textValue(formData, "notes"),
    supportsReasoning: nullableBoolean(formData, "supportsReasoning"),
    supportsTools: nullableBoolean(formData, "supportsTools"),
    supportsStreaming: nullableBoolean(formData, "supportsStreaming"),
    supportsVision: nullableBoolean(formData, "supportsVision"),
    supportsFiles: nullableBoolean(formData, "supportsFiles"),
    supportsStructuredOutput: nullableBoolean(formData, "supportsStructuredOutput"),
    supportsEmbeddings: nullableBoolean(formData, "supportsEmbeddings"),
    reasoningScore: textValue(formData, "reasoningScore"),
    codingScore: textValue(formData, "codingScore"),
    designScore: textValue(formData, "designScore"),
    visionScore: textValue(formData, "visionScore"),
    sqlScore: textValue(formData, "sqlScore"),
    longContextScore: textValue(formData, "longContextScore"),
    speedScore: textValue(formData, "speedScore"),
    taskScores,
    technologyScores,
  });
}

async function persistModel(formData: FormData, mode: "create" | "update") {
  const result = parseModelForm(formData);
  const fallback = mode === "create" ? "/app/modelos/nuevo" : `/app/modelos/${textValue(formData, "modelId")}/editar`;
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  const payload = {
    workspace_id: membership.workspaceId,
    provider_id: result.data.providerId,
    display_name: result.data.displayName,
    api_identifier: result.data.apiIdentifier,
    model_kind: result.data.modelKind,
    status: result.data.status,
    context_window: result.data.contextWindow,
    max_output_tokens: result.data.maxOutputTokens,
    input_cost_per_million: result.data.inputCostPerMillion,
    output_cost_per_million: result.data.outputCostPerMillion,
    currency: result.data.currency,
    pricing_notes: result.data.pricingNotes,
    last_reviewed_at: result.data.lastReviewedAt || null,
    notes: result.data.notes,
    created_by: user.id,
    updated_by: user.id,
  };
  let modelId: string;
  if (mode === "create") {
    const { data, error } = await supabase.from("ai_models").insert(payload).select("id").single();
    if (error || !data) {
      redirectMessage(fallback, "error", error?.code === "23505" ? "Ese identificador ya existe para el proveedor." : "No pudimos crear el modelo.");
    }
    modelId = data.id;
  } else {
    const id = result.data.modelId;
    if (!id) redirectMessage("/app/modelos", "error", "El modelo no es válido.");
    const { created_by: _createdBy, ...updatePayload } = payload;
    void _createdBy;
    const { data, error } = await supabase
      .from("ai_models")
      .update(updatePayload)
      .eq("id", id)
      .eq("workspace_id", membership.workspaceId)
      .select("id")
      .maybeSingle();
    if (error || !data) redirectMessage(fallback, "error", "No pudimos actualizar el modelo.");
    modelId = data.id;
  }
  const capabilitiesResult = await supabase.from("model_capabilities").upsert({
    model_id: modelId,
    workspace_id: membership.workspaceId,
    supports_reasoning: result.data.supportsReasoning,
    supports_tools: result.data.supportsTools,
    supports_streaming: result.data.supportsStreaming,
    supports_vision: result.data.supportsVision,
    supports_files: result.data.supportsFiles,
    supports_structured_output: result.data.supportsStructuredOutput,
    supports_embeddings: result.data.supportsEmbeddings,
    reasoning_score: result.data.reasoningScore,
    coding_score: result.data.codingScore,
    design_score: result.data.designScore,
    vision_score: result.data.visionScore,
    sql_score: result.data.sqlScore,
    long_context_score: result.data.longContextScore,
    speed_score: result.data.speedScore,
    created_by: user.id,
    updated_by: user.id,
  }, { onConflict: "model_id" });
  if (capabilitiesResult.error) redirectMessage(fallback, "error", "El modelo se guardó, pero no sus capacidades.");

  const taskDeleteResult = await supabase
    .from("model_task_scores")
    .delete()
    .eq("model_id", modelId)
    .eq("workspace_id", membership.workspaceId);
  if (taskDeleteResult.error) {
    redirectMessage(fallback, "error", "El modelo se guardó, pero no pudimos reemplazar sus puntuaciones por tarea.");
  }
  const taskRows = Object.entries(result.data.taskScores)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([taskType, score]) => ({
      workspace_id: membership.workspaceId,
      model_id: modelId,
      task_type: taskType,
      score,
      created_by: user.id,
      updated_by: user.id,
    }));
  if (taskRows.length) {
    const taskInsertResult = await supabase
      .from("model_task_scores")
      .insert(taskRows);
    if (taskInsertResult.error) {
      redirectMessage(fallback, "error", "El modelo se guardó, pero no pudimos registrar sus puntuaciones por tarea.");
    }
  }

  const technologyDeleteResult = await supabase
    .from("model_technology_scores")
    .delete()
    .eq("model_id", modelId)
    .eq("workspace_id", membership.workspaceId);
  if (technologyDeleteResult.error) {
    redirectMessage(fallback, "error", "El modelo se guardó, pero no pudimos reemplazar sus afinidades tecnológicas.");
  }
  const technologyRows = Object.entries(result.data.technologyScores)
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([technologyId, score]) => ({
      workspace_id: membership.workspaceId,
      model_id: modelId,
      technology_id: technologyId,
      score,
      created_by: user.id,
      updated_by: user.id,
    }));
  if (technologyRows.length) {
    const technologyInsertResult = await supabase
      .from("model_technology_scores")
      .insert(technologyRows);
    if (technologyInsertResult.error) {
      redirectMessage(fallback, "error", "El modelo se guardó, pero no pudimos registrar sus afinidades tecnológicas.");
    }
  }
  revalidateModelPaths(result.data.providerId, modelId);
  redirectMessage("/app/modelos", "success", mode === "create" ? "El modelo fue agregado al catálogo." : "El modelo y sus puntuaciones fueron actualizados.");
}

export async function createModel(formData: FormData) { return persistModel(formData, "create"); }
export async function updateModel(formData: FormData) { return persistModel(formData, "update"); }

export async function setAgentModelPreference(formData: FormData) {
  const result = modelPreferenceSchema.safeParse({
    entityId: textValue(formData, "agentId"),
    preferredModelId: textValue(formData, "preferredModelId"),
    selectionMode: textValue(formData, "selectionMode"),
    alternativeModelIds: stringValues(formData, "alternativeModelIds"),
  });
  const fallback = `/app/agentes/${textValue(formData, "agentId")}`;
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  const { error } = await supabase.from("agent_model_preferences").upsert({
    agent_id: result.data.entityId,
    workspace_id: membership.workspaceId,
    preferred_model_id: result.data.preferredModelId,
    alternative_model_ids: result.data.alternativeModelIds,
    selection_mode: result.data.selectionMode,
    created_by: user.id,
    updated_by: user.id,
  }, { onConflict: "agent_id" });
  if (error) redirectMessage(fallback, "error", "No pudimos guardar la preferencia del agente.");
  revalidatePath(fallback);
  redirectMessage(fallback, "success", "La preferencia de modelo del agente fue actualizada.");
}

export async function setProjectModelPreference(formData: FormData) {
  const result = modelPreferenceSchema.safeParse({
    entityId: textValue(formData, "projectId"),
    preferredModelId: textValue(formData, "preferredModelId"),
    budgetProfile: textValue(formData, "budgetProfile"),
    speedPreference: textValue(formData, "speedPreference"),
  });
  const fallback = `/app/proyectos/${textValue(formData, "projectId")}`;
  if (!result.success) redirectMessage(fallback, "error", firstIssue(result.error));
  const { supabase, user, membership } = await requireCurrentWorkspace();
  assertCanManage(membership.role, fallback);
  const { error } = await supabase.from("project_model_preferences").upsert({
    project_id: result.data.entityId,
    workspace_id: membership.workspaceId,
    preferred_model_id: result.data.preferredModelId,
    budget_profile: result.data.budgetProfile,
    speed_preference: result.data.speedPreference,
    created_by: user.id,
    updated_by: user.id,
  }, { onConflict: "project_id" });
  if (error) redirectMessage(fallback, "error", "No pudimos guardar la preferencia del proyecto.");
  revalidatePath(fallback);
  redirectMessage(fallback, "success", "La estrategia de modelos del proyecto fue actualizada.");
}
