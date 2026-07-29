import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import { createModelAdapter } from "@/infrastructure/ai/provider-registry";
import { ProviderRequestError } from "@/infrastructure/ai/http";
import { getAppUrl } from "@/lib/env";
import { decryptCredential } from "@/lib/security/credential-crypto";
import { createClient } from "@/lib/supabase/server";
import {
  appendAttachmentsToUserMessage,
  buildConversationSystemPrompt,
  buildProviderMessages,
  limitConversationHistory,
} from "@/modules/conversations/application/prompt-builder";
import { estimateModelCost } from "@/modules/conversations/application/usage";
import { detectSensitiveAttachment } from "@/modules/conversations/domain/attachment-security";
import type {
  ChatAttachmentInput,
  ChatStreamEvent,
  ConversationAgent,
  ConversationMode,
} from "@/modules/conversations/domain/conversation";
import {
  chatRequestSchema,
  conversationIdSchema,
  normalizeChatAttachments,
} from "@/modules/conversations/domain/conversation-schema";
import type {
  AIModelRecord,
  AIProviderRecord,
  ModelTaskType,
} from "@/modules/models/domain/model";
import { recommendModels } from "@/modules/models/domain/model-recommender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ conversationId: string }>;
};

type ProviderRecord = Pick<
  AIProviderRecord,
  | "id"
  | "display_name"
  | "provider_type"
  | "color"
  | "status"
  | "credential_status"
  | "health_status"
> & {
  base_url: string;
};

type RuntimeModel = Omit<AIModelRecord, "provider"> & {
  provider: ProviderRecord;
};

type ProjectRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  permanent_instructions: string;
  project_rules: string;
  conventions: string;
  status: string;
};

type ConversationRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  mode: ConversationMode;
  status: string;
  selected_agent_id: string | null;
  preferred_model_id: string | null;
  project: ProjectRecord;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function numberOrNull(value: unknown): number | null {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
}

function roleFromAgent(value: unknown): ConversationAgent["role"] {
  const role = String(value);
  if (
    [
      "orchestrator",
      "design",
      "frontend",
      "backend",
      "commerce",
      "debugging",
      "architecture",
      "qa",
      "custom",
    ].includes(role)
  ) {
    return role as ConversationAgent["role"];
  }
  return "custom";
}

async function loadRuntimeModels(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
  taskType: ModelTaskType;
  technologyIds: string[];
}): Promise<RuntimeModel[]> {
  const { supabase, workspaceId, taskType, technologyIds } = input;
  const { data } = await supabase
    .from("ai_models")
    .select(
      "id, workspace_id, provider_id, display_name, api_identifier, model_kind, status, context_window, max_output_tokens, input_cost_per_million, output_cost_per_million, currency, pricing_notes, last_reviewed_at, last_synced_at, source_metadata, notes, created_at, updated_at, archived_at, ai_providers!inner(id, display_name, provider_type, base_url, color, status, credential_status, health_status), model_capabilities(model_id, workspace_id, supports_reasoning, supports_tools, supports_streaming, supports_vision, supports_files, supports_structured_output, supports_embeddings, reasoning_score, coding_score, design_score, vision_score, sql_score, long_context_score, speed_score)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .in("model_kind", ["chat", "reasoning", "multimodal"])
    .eq("ai_providers.status", "active")
    .eq("ai_providers.credential_status", "configured")
    .in("ai_providers.provider_type", ["openai", "openrouter", "openai_compatible"])
    .limit(500);

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  if (!rows.length) return [];
  const modelIds = rows.map((row) => String(row.id));

  const [taskResult, technologyResult] = await Promise.all([
    supabase
      .from("model_task_scores")
      .select("model_id, score")
      .eq("workspace_id", workspaceId)
      .eq("task_type", taskType)
      .in("model_id", modelIds),
    technologyIds.length
      ? supabase
          .from("model_technology_scores")
          .select("model_id, technology_id, score")
          .eq("workspace_id", workspaceId)
          .in("technology_id", technologyIds)
          .in("model_id", modelIds)
      : Promise.resolve({ data: [] as Array<{ model_id: string; technology_id: string; score: number }> }),
  ]);

  const taskByModel = new Map<string, number>();
  for (const score of taskResult.data ?? []) taskByModel.set(score.model_id, score.score);
  const technologyByModel = new Map<string, Record<string, number>>();
  for (const score of technologyResult.data ?? []) {
    const current = technologyByModel.get(score.model_id) ?? {};
    current[score.technology_id] = score.score;
    technologyByModel.set(score.model_id, current);
  }

  return rows.flatMap((row) => {
    const provider = firstRelation(
      row.ai_providers as ProviderRecord | ProviderRecord[] | null,
    );
    if (!provider) return [];
    const capabilities = firstRelation(
      row.model_capabilities as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const id = String(row.id);

    return [
      {
        id,
        workspace_id: String(row.workspace_id),
        provider_id: String(row.provider_id),
        display_name: String(row.display_name),
        api_identifier: String(row.api_identifier),
        model_kind: row.model_kind as AIModelRecord["model_kind"],
        status: row.status as AIModelRecord["status"],
        context_window: numberOrNull(row.context_window),
        max_output_tokens: numberOrNull(row.max_output_tokens),
        input_cost_per_million: numberOrNull(row.input_cost_per_million),
        output_cost_per_million: numberOrNull(row.output_cost_per_million),
        currency: String(row.currency ?? "USD"),
        pricing_notes: String(row.pricing_notes ?? ""),
        last_reviewed_at: row.last_reviewed_at ? String(row.last_reviewed_at) : null,
        last_synced_at: row.last_synced_at ? String(row.last_synced_at) : null,
        source_metadata: recordOf(row.source_metadata),
        notes: String(row.notes ?? ""),
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
        archived_at: row.archived_at ? String(row.archived_at) : null,
        provider,
        capabilities: capabilities
          ? {
              model_id: id,
              workspace_id: workspaceId,
              supports_reasoning:
                typeof capabilities.supports_reasoning === "boolean"
                  ? capabilities.supports_reasoning
                  : null,
              supports_tools:
                typeof capabilities.supports_tools === "boolean"
                  ? capabilities.supports_tools
                  : null,
              supports_streaming:
                typeof capabilities.supports_streaming === "boolean"
                  ? capabilities.supports_streaming
                  : null,
              supports_vision:
                typeof capabilities.supports_vision === "boolean"
                  ? capabilities.supports_vision
                  : null,
              supports_files:
                typeof capabilities.supports_files === "boolean"
                  ? capabilities.supports_files
                  : null,
              supports_structured_output:
                typeof capabilities.supports_structured_output === "boolean"
                  ? capabilities.supports_structured_output
                  : null,
              supports_embeddings:
                typeof capabilities.supports_embeddings === "boolean"
                  ? capabilities.supports_embeddings
                  : null,
              reasoning_score: numberOrNull(capabilities.reasoning_score),
              coding_score: numberOrNull(capabilities.coding_score),
              design_score: numberOrNull(capabilities.design_score),
              vision_score: numberOrNull(capabilities.vision_score),
              sql_score: numberOrNull(capabilities.sql_score),
              long_context_score: numberOrNull(capabilities.long_context_score),
              speed_score: numberOrNull(capabilities.speed_score),
            }
          : null,
        taskScores: taskByModel.has(id) ? { [taskType]: taskByModel.get(id) } : {},
        technologyScores: technologyByModel.get(id) ?? {},
      } satisfies RuntimeModel,
    ];
  });
}

function pickModel(input: {
  models: RuntimeModel[];
  requestedModelId: string | null;
  conversationModelId: string | null;
  projectModelId: string | null;
  agentModelId: string | null;
  taskType: ModelTaskType;
  technologyIds: string[];
  estimatedContextTokens: number;
  budgetProfile: "economy" | "balanced" | "quality";
  speedPreference: "fast" | "balanced" | "quality";
}): RuntimeModel | null {
  const directIds = [
    input.requestedModelId,
    input.conversationModelId,
    input.projectModelId,
    input.agentModelId,
  ].filter((value): value is string => Boolean(value));

  for (const id of directIds) {
    const match = input.models.find((model) => model.id === id);
    if (match) return match;
  }

  return (
    recommendModels(input.models, {
      taskType: input.taskType,
      technologyIds: input.technologyIds,
      requiresReasoning: ["debugging", "architecture", "analysis"].includes(
        input.taskType,
      ),
      requiresVision: false,
      requiresTools: false,
      requiresFiles: false,
      estimatedContextTokens: input.estimatedContextTokens,
      budgetProfile: input.budgetProfile,
      speedPreference: input.speedPreference,
      preferredModelId: null,
    })[0]?.model as RuntimeModel | undefined
  ) ?? input.models[0] ?? null;
}

function attachmentChecksum(attachment: ChatAttachmentInput): string {
  return createHash("sha256")
    .update(attachment.fileName)
    .update("\0")
    .update(attachment.content)
    .digest("hex");
}

function streamEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: ChatStreamEvent) {
  controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  const idResult = conversationIdSchema.safeParse(conversationId);
  if (!idResult.success) return jsonError("La conversación no es válida.", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("La solicitud no contiene JSON válido.", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Revisa el mensaje.", 400);
  }
  const payload = {
    ...parsed.data,
    attachments: normalizeChatAttachments(parsed.data.attachments),
  };
  const sensitiveAttachment = payload.attachments.find(
    (attachment: ChatAttachmentInput) =>
      detectSensitiveAttachment(attachment) !== null,
  );
  if (sensitiveAttachment) {
    const reason = detectSensitiveAttachment(sensitiveAttachment);
    return jsonError(
      `${sensitiveAttachment.fileName} ${reason ?? "parece contener información sensible"}. El adjunto fue bloqueado.`,
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Tu sesión expiró. Inicia sesión nuevamente.", 401);

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) return jsonError("No existe una oficina activa.", 403);

  const { data: conversationData } = await supabase
    .from("conversations")
    .select(
      "id, workspace_id, project_id, title, mode, status, selected_agent_id, preferred_model_id, projects(id, workspace_id, name, description, permanent_instructions, project_rules, conventions, status)",
    )
    .eq("id", idResult.data)
    .eq("workspace_id", membership.workspace_id)
    .maybeSingle();
  if (!conversationData) return jsonError("No encontramos la conversación.", 404);

  const project = firstRelation(
    (conversationData as unknown as Record<string, unknown>).projects as
      | ProjectRecord
      | ProjectRecord[]
      | null,
  );
  if (
    !project ||
    project.status === "archived" ||
    conversationData.status !== "active"
  ) {
    return jsonError("La conversación o el proyecto no están disponibles.", 409);
  }

  const conversation: ConversationRow = {
    id: conversationData.id,
    workspace_id: conversationData.workspace_id,
    project_id: conversationData.project_id,
    title: conversationData.title,
    mode: conversationData.mode as ConversationMode,
    status: conversationData.status,
    selected_agent_id: conversationData.selected_agent_id,
    preferred_model_id: conversationData.preferred_model_id,
    project,
  };

  const { count: runningExecutionCount } = await supabase
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .eq("conversation_id", conversation.id)
    .eq("status", "running");
  if ((runningExecutionCount ?? 0) > 0) {
    return jsonError(
      "Esta conversación ya tiene una ejecución activa. Espera a que termine o detenla.",
      409,
    );
  }

  const { data: assignmentRows } = await supabase
    .from("project_agents")
    .select(
      "agent_id, is_lead, assigned_at, agents(id, name, role, icon, color, instructions, creativity, status)",
    )
    .eq("workspace_id", membership.workspace_id)
    .eq("project_id", project.id)
    .eq("status", "active")
    .order("is_lead", { ascending: false })
    .order("assigned_at", { ascending: true });

  const team = ((assignmentRows ?? []) as unknown as Array<Record<string, unknown>>).flatMap(
    (row) => {
      const agent = firstRelation(
        row.agents as Record<string, unknown> | Record<string, unknown>[] | null,
      );
      if (!agent || agent.status !== "active") return [];
      return [
        {
          id: String(agent.id),
          name: String(agent.name),
          role: roleFromAgent(agent.role),
          icon: String(agent.icon),
          color: String(agent.color),
          instructions: String(agent.instructions ?? ""),
          creativity: Number(agent.creativity ?? 40),
          isLead: Boolean(row.is_lead),
        },
      ];
    },
  );

  const agent =
    team.find((item) => item.id === payload.agentId) ??
    team.find((item) => item.id === conversation.selected_agent_id) ??
    team.find((item) => item.isLead) ??
    team[0];
  if (!agent) {
    return jsonError(
      "Asigna al menos un agente activo al proyecto antes de conversar.",
      409,
    );
  }

  const [{ data: technologyRows }, projectPreferenceResult, agentPreferenceResult] =
    await Promise.all([
      supabase
        .from("project_technologies")
        .select("technology_id, technologies(name, version)")
        .eq("workspace_id", membership.workspace_id)
        .eq("project_id", project.id),
      supabase
        .from("project_model_preferences")
        .select("preferred_model_id, budget_profile, speed_preference")
        .eq("workspace_id", membership.workspace_id)
        .eq("project_id", project.id)
        .maybeSingle(),
      supabase
        .from("agent_model_preferences")
        .select("preferred_model_id, selection_mode")
        .eq("workspace_id", membership.workspace_id)
        .eq("agent_id", agent.id)
        .maybeSingle(),
    ]);

  type ProjectTechnologyRow = {
    technology_id: string;
    technologies:
      | { name: string; version: string | null }
      | Array<{ name: string; version: string | null }>
      | null;
  };
  const typedTechnologyRows = (technologyRows ?? []) as unknown as ProjectTechnologyRow[];
  const technologyIds = typedTechnologyRows.map(
    (row: ProjectTechnologyRow) => row.technology_id,
  );
  const technologyNames = typedTechnologyRows.flatMap(
    (row: ProjectTechnologyRow) => {
      const technology = firstRelation(row.technologies);
      if (!technology) return [];
      const version = technology.version ? ` ${technology.version}` : "";
      return [`${technology.name}${version}`];
    },
  );

  const models = await loadRuntimeModels({
    supabase,
    workspaceId: membership.workspace_id,
    taskType: payload.taskType,
    technologyIds,
  });
  if (!models.length) {
    return jsonError(
      "No hay modelos ejecutables con credencial configurada. Revisa Modelos IA.",
      409,
    );
  }

  const systemPrompt = buildConversationSystemPrompt({
    project: {
      name: project.name,
      description: project.description,
      permanentInstructions: project.permanent_instructions,
      rules: project.project_rules,
      conventions: project.conventions,
      technologies: technologyNames,
    },
    agent,
    mode: payload.mode,
    teamMembers: team,
  });
  const currentUserContent = appendAttachmentsToUserMessage(
    payload.content,
    payload.attachments,
  );
  const estimatedContextTokens = Math.max(
    1000,
    Math.ceil((systemPrompt.length + currentUserContent.length) / 4) + 2_000,
  );
  const projectPreference = projectPreferenceResult.data;
  const agentPreference = agentPreferenceResult.data;
  const model = pickModel({
    models,
    requestedModelId: payload.modelId,
    conversationModelId: conversation.preferred_model_id,
    projectModelId: projectPreference?.preferred_model_id ?? null,
    agentModelId:
      agentPreference?.selection_mode === "fixed"
        ? agentPreference.preferred_model_id
        : null,
    taskType: payload.taskType,
    technologyIds,
    estimatedContextTokens,
    budgetProfile: projectPreference?.budget_profile ?? "balanced",
    speedPreference: projectPreference?.speed_preference ?? "balanced",
  });
  if (!model) return jsonError("No encontramos un modelo compatible.", 409);
  if (
    model.context_window !== null &&
    estimatedContextTokens > Math.floor(model.context_window * 0.85)
  ) {
    return jsonError(
      `El contexto actual requiere aproximadamente ${estimatedContextTokens.toLocaleString("es-MX")} tokens y supera el margen seguro de ${model.display_name}. Reduce los adjuntos o elige un modelo con mayor contexto.`,
      413,
    );
  }

  const { data: credentialRows, error: credentialError } = await supabase.rpc(
    "get_provider_credential",
    { p_provider_id: model.provider.id },
  );
  const credential = Array.isArray(credentialRows) ? credentialRows[0] : null;
  if (credentialError || !credential) {
    return jsonError("La credencial del proveedor no está disponible.", 409);
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
    return jsonError(
      error instanceof Error ? error.message : "No pudimos descifrar la credencial.",
      500,
    );
  }

  const { data: historyRows } = await supabase
    .from("messages")
    .select(
      "id, role, content, sequence_number, message_attachments(file_name, mime_type, language, content_text)",
    )
    .eq("workspace_id", membership.workspace_id)
    .eq("conversation_id", conversation.id)
    .eq("status", "completed")
    .in("role", ["user", "assistant"])
    .order("sequence_number", { ascending: false })
    .limit(20);

  const rawHistory = ((historyRows ?? []) as unknown as Array<Record<string, unknown>>)
    .reverse()
    .map((row) => {
      const attachments = Array.isArray(row.message_attachments)
        ? row.message_attachments.map((item) => recordOf(item))
        : [];
      const previousAttachments: ChatAttachmentInput[] = attachments.map((attachment) => ({
        fileName: String(attachment.file_name),
        mimeType: String(attachment.mime_type),
        sizeBytes: String(attachment.content_text ?? "").length,
        language: attachment.language ? String(attachment.language) : null,
        content: String(attachment.content_text ?? ""),
      }));
      return {
        role: row.role as "user" | "assistant",
        content:
          row.role === "user"
            ? appendAttachmentsToUserMessage(String(row.content ?? ""), previousAttachments)
            : String(row.content ?? ""),
      };
    });
  const outputReserve = Math.min(model.max_output_tokens ?? 8_192, 16_384);
  const modelContextWindow = model.context_window ?? 128_000;
  const historyCharacterBudget = Math.max(
    0,
    Math.min(
      400_000,
      (modelContextWindow - estimatedContextTokens - outputReserve - 2_000) * 4,
    ),
  );
  const history = limitConversationHistory(rawHistory, historyCharacterBudget);

  const now = new Date().toISOString();
  const { data: userMessage, error: userMessageError } = await supabase
    .from("messages")
    .insert({
      workspace_id: membership.workspace_id,
      project_id: project.id,
      conversation_id: conversation.id,
      role: "user",
      status: "completed",
      agent_id: null,
      model_id: null,
      content: payload.content,
      created_by: user.id,
      completed_at: now,
    })
    .select("id")
    .single();
  if (userMessageError || !userMessage) {
    return jsonError("No pudimos guardar tu mensaje.", 500);
  }

  if (payload.attachments.length) {
    const { error: attachmentError } = await supabase
      .from("message_attachments")
      .insert(
        payload.attachments.map((attachment: ChatAttachmentInput) => ({
          workspace_id: membership.workspace_id,
          project_id: project.id,
          conversation_id: conversation.id,
          message_id: userMessage.id,
          file_name: attachment.fileName,
          mime_type: attachment.mimeType,
          size_bytes: attachment.sizeBytes,
          language: attachment.language,
          content_text: attachment.content,
          content_checksum: attachmentChecksum(attachment),
          created_by: user.id,
        })),
      );
    if (attachmentError) {
      await supabase.from("messages").update({ status: "failed", error_message: "No pudimos guardar los adjuntos." }).eq("id", userMessage.id);
      return jsonError("No pudimos guardar los adjuntos.", 500);
    }
  }

  const { data: assistantMessage, error: assistantMessageError } = await supabase
    .from("messages")
    .insert({
      workspace_id: membership.workspace_id,
      project_id: project.id,
      conversation_id: conversation.id,
      role: "assistant",
      status: "streaming",
      agent_id: agent.id,
      model_id: model.id,
      content: "",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (assistantMessageError || !assistantMessage) {
    return jsonError("No pudimos preparar la respuesta del agente.", 500);
  }

  const startedAt = Date.now();
  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: membership.workspace_id,
      project_id: project.id,
      conversation_id: conversation.id,
      user_message_id: userMessage.id,
      assistant_message_id: assistantMessage.id,
      agent_id: agent.id,
      model_id: model.id,
      provider_id: model.provider.id,
      mode: payload.mode,
      task_type: payload.taskType,
      status: "running",
      started_at: new Date(startedAt).toISOString(),
      initiated_by: user.id,
      metadata: {
        attachment_count: payload.attachments.length,
        selected_manually: Boolean(payload.modelId),
      },
    })
    .select("id")
    .single();
  if (runError || !run) {
    await supabase.from("messages").update({ status: "failed", error_message: "No pudimos registrar la ejecución." }).eq("id", assistantMessage.id);
    return jsonError("No pudimos registrar la ejecución.", 500);
  }

  await Promise.all([
    supabase
      .from("conversations")
      .update({
        mode: payload.mode,
        selected_agent_id: agent.id,
        preferred_model_id: payload.modelId ?? conversation.preferred_model_id,
        updated_by: user.id,
      })
      .eq("id", conversation.id)
      .eq("workspace_id", membership.workspace_id),
    supabase.from("conversation_participants").upsert(
      {
        conversation_id: conversation.id,
        workspace_id: membership.workspace_id,
        agent_id: agent.id,
        participant_role: "lead",
        status: "active",
        added_by: user.id,
      },
      { onConflict: "conversation_id,agent_id" },
    ),
  ]);

  const providerMessages = buildProviderMessages({
    systemPrompt,
    history,
    currentUserContent,
  });
  const adapter = createModelAdapter({
    type: model.provider.provider_type,
    baseUrl: model.provider.base_url,
    apiKey,
    appUrl: getAppUrl(),
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulated = "";
      let closed = false;
      const safeEvent = (event: ChatStreamEvent) => {
        if (closed) return;
        try {
          streamEvent(controller, event);
        } catch {
          closed = true;
        }
      };

      safeEvent({
        type: "meta",
        assistantMessageId: assistantMessage.id,
        runId: run.id,
        model: {
          id: model.id,
          name: model.display_name,
          provider: model.provider.display_name,
        },
        agent: { id: agent.id, name: agent.name },
      });

      try {
        const result = await adapter.stream(
          {
            model: model.api_identifier,
            messages: providerMessages,
            maxOutputTokens: model.max_output_tokens
              ? Math.min(model.max_output_tokens, 16_384)
              : 8_192,
            stream: true,
            signal: request.signal,
          },
          async (event) => {
            if (event.type === "text_delta") {
              accumulated += event.text;
              safeEvent({ type: "delta", text: event.text });
            }
          },
        );

        const durationMs = Date.now() - startedAt;
        const estimatedCost = estimateModelCost({
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          inputCostPerMillion: model.input_cost_per_million,
          outputCostPerMillion: model.output_cost_per_million,
        });
        const completedAt = new Date().toISOString();

        await Promise.all([
          supabase
            .from("messages")
            .update({
              status: "completed",
              content: result.content || accumulated,
              completed_at: completedAt,
              error_message: null,
            })
            .eq("id", assistantMessage.id),
          supabase
            .from("agent_runs")
            .update({
              status: "completed",
              input_tokens: result.usage.inputTokens,
              output_tokens: result.usage.outputTokens,
              estimated_cost: estimatedCost,
              currency: model.currency,
              completed_at: completedAt,
              duration_ms: durationMs,
            })
            .eq("id", run.id),
          supabase.from("model_usage").insert({
            workspace_id: membership.workspace_id,
            project_id: project.id,
            conversation_id: conversation.id,
            run_id: run.id,
            provider_id: model.provider.id,
            model_id: model.id,
            input_tokens: result.usage.inputTokens,
            output_tokens: result.usage.outputTokens,
            total_tokens: result.usage.totalTokens,
            estimated_cost: estimatedCost,
            currency: model.currency,
            duration_ms: durationMs,
            created_by: user.id,
          }),
        ]);

        safeEvent({
          type: "usage",
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          estimatedCost,
          currency: model.currency,
        });
        safeEvent({
          type: "completed",
          finishReason: result.finishReason,
          durationMs,
        });
      } catch (error) {
        const requestError = error instanceof ProviderRequestError ? error : null;
        const cancelled = requestError?.code === "cancelled" || request.signal.aborted;
        const status = cancelled ? "cancelled" : "failed";
        const durationMs = Date.now() - startedAt;
        const message =
          error instanceof Error ? error.message : "La ejecución terminó con un error.";
        const completedAt = new Date().toISOString();

        await Promise.all([
          supabase
            .from("messages")
            .update({
              status,
              content: accumulated,
              error_message: message,
              completed_at: completedAt,
            })
            .eq("id", assistantMessage.id),
          supabase
            .from("agent_runs")
            .update({
              status,
              error_code: requestError?.code ?? null,
              error_message: message,
              completed_at: completedAt,
              duration_ms: durationMs,
            })
            .eq("id", run.id),
        ]);

        safeEvent({
          type: "error",
          message,
          code: requestError?.code ?? null,
        });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // El cliente puede haber cancelado el stream.
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
