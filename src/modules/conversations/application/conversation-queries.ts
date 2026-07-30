import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type {
  ConversationAgent,
  ConversationHandoffRecord,
  ConversationMessageRecord,
  ConversationModel,
  ConversationRecord,
} from "@/modules/conversations/domain/conversation";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadConversationList(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  filters?: { projectId?: string; status?: string; search?: string },
): Promise<ConversationRecord[]> {
  // Keep the base list query free of embedded relationships. PostgREST can fail
  // to resolve one nested relationship and return no data; the previous
  // implementation ignored that error and rendered an incorrect empty state.
  let query = supabase
    .from("conversations")
    .select(
      "id, workspace_id, project_id, title, mode, status, selected_agent_id, preferred_model_id, created_by, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (filters?.projectId) query = query.eq("project_id", filters.projectId);
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, error } = await query;

  if (error) {
    throw new Error(`No pudimos consultar las conversaciones: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  if (!rows.length) return [];

  const conversationIds = rows.map((row) => String(row.id));
  const projectIds = [
    ...new Set(rows.map((row) => String(row.project_id)).filter(Boolean)),
  ];
  const agentIds = [
    ...new Set(
      rows
        .map((row) => (row.selected_agent_id ? String(row.selected_agent_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const modelIds = [
    ...new Set(
      rows
        .map((row) => (row.preferred_model_id ? String(row.preferred_model_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [projectsResult, agentsResult, modelsResult, messagesResult] =
    await Promise.all([
      projectIds.length
        ? supabase
            .from("projects")
            .select("id, name, color, status")
            .eq("workspace_id", workspaceId)
            .in("id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      agentIds.length
        ? supabase
            .from("agents")
            .select("id, name, role, icon, color")
            .eq("workspace_id", workspaceId)
            .in("id", agentIds)
        : Promise.resolve({ data: [], error: null }),
      modelIds.length
        ? supabase
            .from("ai_models")
            .select("id, display_name, api_identifier, provider_id")
            .eq("workspace_id", workspaceId)
            .in("id", modelIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("messages")
        .select("conversation_id, content, sequence_number, status")
        .eq("workspace_id", workspaceId)
        .in("conversation_id", conversationIds)
        .in("status", ["completed", "cancelled", "failed"])
        .order("sequence_number", { ascending: false })
        .limit(1000),
    ]);

  if (projectsResult.error) {
    throw new Error(
      `No pudimos consultar los proyectos de las conversaciones: ${projectsResult.error.message}`,
    );
  }
  if (agentsResult.error) {
    throw new Error(
      `No pudimos consultar los agentes de las conversaciones: ${agentsResult.error.message}`,
    );
  }
  if (modelsResult.error) {
    throw new Error(
      `No pudimos consultar los modelos de las conversaciones: ${modelsResult.error.message}`,
    );
  }
  if (messagesResult.error) {
    throw new Error(
      `No pudimos consultar los mensajes de las conversaciones: ${messagesResult.error.message}`,
    );
  }

  const modelRows = (modelsResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const providerIds = [
    ...new Set(
      modelRows
        .map((row) => (row.provider_id ? String(row.provider_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const providersResult = providerIds.length
    ? await supabase
        .from("ai_providers")
        .select("id, display_name, color")
        .eq("workspace_id", workspaceId)
        .in("id", providerIds)
    : { data: [], error: null };

  if (providersResult.error) {
    throw new Error(
      `No pudimos consultar los proveedores de las conversaciones: ${providersResult.error.message}`,
    );
  }

  const projectRows = (projectsResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const agentRows = (agentsResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const providerRows = (providersResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;

  const projectsById = new Map(
    projectRows.map((project) => [String(project.id), project]),
  );
  const agentsById = new Map(
    agentRows.map((agent) => [String(agent.id), agent]),
  );
  const providersById = new Map(
    providerRows.map((provider) => [String(provider.id), provider]),
  );
  const modelsById = new Map(
    modelRows.map((model) => [String(model.id), model]),
  );

  const messageCounts = new Map<string, number>();
  const previews = new Map<string, string>();

  for (const message of messagesResult.data ?? []) {
    const conversationId = String(message.conversation_id);
    messageCounts.set(
      conversationId,
      (messageCounts.get(conversationId) ?? 0) + 1,
    );

    if (!previews.has(conversationId) && message.content) {
      previews.set(conversationId, String(message.content).slice(0, 160));
    }
  }

  return rows.map((row) => {
    const id = String(row.id);
    const projectId = String(row.project_id);
    const agentId = row.selected_agent_id
      ? String(row.selected_agent_id)
      : null;
    const modelId = row.preferred_model_id
      ? String(row.preferred_model_id)
      : null;
    const project = projectsById.get(projectId);
    const selectedAgent = agentId ? agentsById.get(agentId) : null;
    const model = modelId ? modelsById.get(modelId) : null;
    const provider = model?.provider_id
      ? providersById.get(String(model.provider_id))
      : null;

    return {
      id,
      workspace_id: String(row.workspace_id),
      project_id: projectId,
      title: String(row.title),
      mode: row.mode as ConversationRecord["mode"],
      status: row.status as ConversationRecord["status"],
      selected_agent_id: agentId,
      preferred_model_id: modelId,
      created_by: String(row.created_by),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      archived_at: row.archived_at ? String(row.archived_at) : null,
      project: project
        ? {
            id: String(project.id),
            name: String(project.name),
            color: String(project.color),
            status: String(project.status),
          }
        : undefined,
      selectedAgent: selectedAgent
        ? {
            id: String(selectedAgent.id),
            name: String(selectedAgent.name),
            role: selectedAgent.role as ConversationAgent["role"],
            icon: String(selectedAgent.icon),
            color: String(selectedAgent.color),
          }
        : null,
      preferredModel: model
        ? {
            id: String(model.id),
            displayName: String(model.display_name),
            apiIdentifier: String(model.api_identifier),
            providerName: provider
              ? String(provider.display_name)
              : "Proveedor",
            providerColor: provider ? String(provider.color) : "#55e6c1",
          }
        : null,
      messageCount: messageCounts.get(id) ?? 0,
      lastMessagePreview: previews.get(id) ?? null,
    };
  });
}

export async function loadConversationById(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  conversationId: string,
): Promise<ConversationRecord | null> {
  // Load the base row first. Keeping this query free of embedded relations prevents
  // a PostgREST relationship-resolution error from being mistaken for a missing
  // conversation and incorrectly rendering a 404.
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select(
      "id, workspace_id, project_id, title, mode, status, selected_agent_id, preferred_model_id, created_by, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    throw new Error(
      `No pudimos consultar la conversación: ${conversationError.message}`,
    );
  }

  if (!conversation) return null;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, color, status")
    .eq("workspace_id", workspaceId)
    .eq("id", conversation.project_id)
    .maybeSingle();

  if (projectError) {
    throw new Error(
      `No pudimos consultar el proyecto de la conversación: ${projectError.message}`,
    );
  }

  if (!project) {
    throw new Error(
      "La conversación existe, pero su proyecto no está disponible en el workspace actual.",
    );
  }

  return {
    id: conversation.id,
    workspace_id: conversation.workspace_id,
    project_id: conversation.project_id,
    title: conversation.title,
    mode: conversation.mode as ConversationRecord["mode"],
    status: conversation.status as ConversationRecord["status"],
    selected_agent_id: conversation.selected_agent_id,
    preferred_model_id: conversation.preferred_model_id,
    created_by: conversation.created_by,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    archived_at: conversation.archived_at,
    project: {
      id: project.id,
      name: project.name,
      color: project.color,
      status: project.status,
    },
    selectedAgent: null,
    preferredModel: null,
  };
}

export async function loadConversationMessages(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  conversationId: string,
  userId?: string,
): Promise<ConversationMessageRecord[]> {
  const [messagesResult, retrievalResult, executionResult, feedbackResult] = await Promise.all([
    supabase
      .from("messages")
      .select(
        "id, conversation_id, role, status, agent_id, model_id, content, error_message, created_at, completed_at, agents(id, name, role, icon, color), ai_models(id, display_name, ai_providers(display_name)), message_attachments(id, file_name, mime_type, size_bytes, language)",
      )
      .eq("workspace_id", workspaceId)
      .eq("conversation_id", conversationId)
      .order("sequence_number", { ascending: true })
      .limit(300),
    supabase
      .from("memory_retrieval_logs")
      .select("message_id, sources")
      .eq("workspace_id", workspaceId)
      .eq("conversation_id", conversationId)
      .not("message_id", "is", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("team_executions")
      .select(
        "id, assistant_message_id, status, plan, specialist_count, total_input_tokens, total_output_tokens, total_estimated_cost, currency, duration_ms",
      )
      .eq("workspace_id", workspaceId)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    userId
      ? supabase
          .from("user_feedback")
          .select("id, message_id, verdict, rating, correction_count, notes, estimated_minutes_saved")
          .eq("workspace_id", workspaceId)
          .eq("conversation_id", conversationId)
          .eq("created_by", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (messagesResult.error) {
    throw new Error(`No pudimos consultar los mensajes: ${messagesResult.error.message}`);
  }
  if (executionResult.error) {
    throw new Error(
      `No pudimos consultar las ejecuciones del equipo: ${executionResult.error.message}`,
    );
  }
  if (feedbackResult.error) {
    throw new Error(`No pudimos consultar la evaluación de los mensajes: ${feedbackResult.error.message}`);
  }

  const executionRows = (executionResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const executionIds = executionRows.map((row) => String(row.id));
  const handoffResult = executionIds.length
    ? await supabase
        .from("agent_handoffs")
        .select(
          "id, team_execution_id, sequence_number, status, reason, result_received, source_agent_id, target_agent_id, model_id, input_tokens, output_tokens, estimated_cost, currency, duration_ms",
        )
        .eq("workspace_id", workspaceId)
        .in("team_execution_id", executionIds)
        .order("sequence_number", { ascending: true })
    : { data: [], error: null };

  if (handoffResult.error) {
    throw new Error(
      `No pudimos consultar los handoffs del equipo: ${handoffResult.error.message}`,
    );
  }

  const handoffRows = (handoffResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const agentIds = [
    ...new Set(
      handoffRows.flatMap((row) =>
        [row.source_agent_id, row.target_agent_id]
          .filter(Boolean)
          .map((value) => String(value)),
      ),
    ),
  ];
  const modelIds = [
    ...new Set(
      handoffRows
        .map((row) => (row.model_id ? String(row.model_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [teamAgentsResult, teamModelsResult] = await Promise.all([
    agentIds.length
      ? supabase
          .from("agents")
          .select("id, name, role, color")
          .eq("workspace_id", workspaceId)
          .in("id", agentIds)
      : Promise.resolve({ data: [], error: null }),
    modelIds.length
      ? supabase
          .from("ai_models")
          .select("id, display_name, provider_id")
          .eq("workspace_id", workspaceId)
          .in("id", modelIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamAgentsResult.error || teamModelsResult.error) {
    throw new Error("No pudimos completar los detalles de la colaboración del equipo.");
  }

  const teamModelRows = (teamModelsResult.data ?? []) as unknown as Array<
    Record<string, unknown>
  >;
  const providerIds = [
    ...new Set(
      teamModelRows
        .map((row) => (row.provider_id ? String(row.provider_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const providerResult = providerIds.length
    ? await supabase
        .from("ai_providers")
        .select("id, display_name")
        .eq("workspace_id", workspaceId)
        .in("id", providerIds)
    : { data: [], error: null };

  const sourcesByMessage = new Map<
    string,
    ConversationMessageRecord["retrievalSources"]
  >();
  for (const item of retrievalResult.data ?? []) {
    const sources = Array.isArray(item.sources) ? item.sources : [];
    sourcesByMessage.set(
      String(item.message_id),
      sources.flatMap((source: unknown) => {
        const record = recordOf(source);
        const sourceType = String(record.sourceType);
        if (sourceType !== "document_chunk" && sourceType !== "memory") return [];
        return [
          {
            sourceType,
            sourceId: String(record.sourceId),
            title: String(record.title),
            score: Number(record.score ?? 0),
            documentId: record.documentId ? String(record.documentId) : null,
            fileName: record.fileName ? String(record.fileName) : null,
            chunkIndex:
              typeof record.chunkIndex === "number" ? record.chunkIndex : null,
          } satisfies ConversationMessageRecord["retrievalSources"][number],
        ];
      }),
    );
  }

  const teamAgentsById = new Map(
    ((teamAgentsResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(
      (row) => [String(row.id), row],
    ),
  );
  const teamModelsById = new Map(
    teamModelRows.map((row) => [String(row.id), row]),
  );
  const providersById = new Map(
    ((providerResult.data ?? []) as unknown as Array<Record<string, unknown>>).map(
      (row) => [String(row.id), row],
    ),
  );
  const handoffsByExecution = new Map<string, ConversationHandoffRecord[]>();

  for (const row of handoffRows) {
    const executionId = String(row.team_execution_id);
    const source = row.source_agent_id
      ? teamAgentsById.get(String(row.source_agent_id))
      : null;
    const target = row.target_agent_id
      ? teamAgentsById.get(String(row.target_agent_id))
      : null;
    const model = row.model_id ? teamModelsById.get(String(row.model_id)) : null;
    const provider = model?.provider_id
      ? providersById.get(String(model.provider_id))
      : null;
    const current = handoffsByExecution.get(executionId) ?? [];
    current.push({
      id: String(row.id),
      sequenceNumber: Number(row.sequence_number),
      status: row.status as ConversationHandoffRecord["status"],
      reason: String(row.reason ?? ""),
      resultSummary: String(row.result_received ?? "").replace(/\s+/g, " ").slice(0, 360),
      sourceAgent: source
        ? {
            id: String(source.id),
            name: String(source.name),
            role: source.role as ConversationAgent["role"],
            color: String(source.color),
          }
        : null,
      targetAgent: target
        ? {
            id: String(target.id),
            name: String(target.name),
            role: target.role as ConversationAgent["role"],
            color: String(target.color),
          }
        : null,
      model: model
        ? {
            id: String(model.id),
            displayName: String(model.display_name),
            providerName: provider ? String(provider.display_name) : "Proveedor",
          }
        : null,
      inputTokens: row.input_tokens === null ? null : Number(row.input_tokens),
      outputTokens: row.output_tokens === null ? null : Number(row.output_tokens),
      estimatedCost:
        row.estimated_cost === null ? null : Number(row.estimated_cost),
      currency: String(row.currency ?? "USD"),
      durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
    });
    handoffsByExecution.set(executionId, current);
  }

  const feedbackByMessage = new Map(
    (feedbackResult.data ?? []).map((row) => [
      String(row.message_id),
      {
        id: String(row.id),
        verdict: row.verdict as NonNullable<ConversationMessageRecord["feedback"]>["verdict"],
        rating: Number(row.rating),
        correctionCount: Number(row.correction_count ?? 0),
        notes: String(row.notes ?? ""),
        estimatedMinutesSaved:
          row.estimated_minutes_saved === null
            ? null
            : Number(row.estimated_minutes_saved),
      },
    ]),
  );

  const teamExecutionByMessage = new Map<
    string,
    NonNullable<ConversationMessageRecord["teamExecution"]>
  >();
  for (const row of executionRows) {
    if (!row.assistant_message_id) continue;
    const plan = recordOf(row.plan);
    teamExecutionByMessage.set(String(row.assistant_message_id), {
      id: String(row.id),
      status: row.status as NonNullable<
        ConversationMessageRecord["teamExecution"]
      >["status"],
      summary: typeof plan.summary === "string" ? plan.summary : "",
      generatedBy:
        plan.generatedBy === "orchestrator" || plan.generatedBy === "fallback"
          ? plan.generatedBy
          : null,
      specialistCount: Number(row.specialist_count ?? 0),
      totalInputTokens:
        row.total_input_tokens === null ? null : Number(row.total_input_tokens),
      totalOutputTokens:
        row.total_output_tokens === null ? null : Number(row.total_output_tokens),
      totalEstimatedCost:
        row.total_estimated_cost === null
          ? null
          : Number(row.total_estimated_cost),
      currency: String(row.currency ?? "USD"),
      durationMs: row.duration_ms === null ? null : Number(row.duration_ms),
      handoffs: handoffsByExecution.get(String(row.id)) ?? [],
    });
  }

  return ((messagesResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const agent = firstRelation(
      row.agents as
        | ConversationMessageRecord["agent"]
        | ConversationMessageRecord["agent"][]
        | null,
    );
    const modelRaw = firstRelation(
      row.ai_models as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const providerRaw = modelRaw
      ? firstRelation(
          modelRaw.ai_providers as
            | Record<string, unknown>
            | Record<string, unknown>[]
            | null,
        )
      : null;
    const attachments = Array.isArray(row.message_attachments)
      ? row.message_attachments
      : [];
    const id = String(row.id);

    return {
      id,
      conversation_id: String(row.conversation_id),
      role: row.role as ConversationMessageRecord["role"],
      status: row.status as ConversationMessageRecord["status"],
      agent_id: row.agent_id ? String(row.agent_id) : null,
      model_id: row.model_id ? String(row.model_id) : null,
      content: String(row.content ?? ""),
      error_message: row.error_message ? String(row.error_message) : null,
      created_at: String(row.created_at),
      completed_at: row.completed_at ? String(row.completed_at) : null,
      agent: agent ?? null,
      model: modelRaw
        ? {
            id: String(modelRaw.id),
            displayName: String(modelRaw.display_name),
            providerName: providerRaw
              ? String(providerRaw.display_name)
              : "Proveedor",
          }
        : null,
      attachments: attachments.map((attachment) => {
        const record = recordOf(attachment);
        return {
          id: String(record.id),
          file_name: String(record.file_name),
          mime_type: String(record.mime_type),
          size_bytes: Number(record.size_bytes),
          language: record.language ? String(record.language) : null,
        };
      }),
      retrievalSources: sourcesByMessage.get(id) ?? [],
      teamExecution: teamExecutionByMessage.get(id) ?? null,
      feedback: feedbackByMessage.get(id) ?? null,
    };
  });
}

export async function loadConversationProjects(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<ConversationProjectOption[]> {
  const { data } = await supabase
    .from("projects")
    .select("id, name, color, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name");

  return (data ?? []) as ConversationProjectOption[];
}

export type ConversationProjectOption = {
  id: string;
  name: string;
  color: string;
  status: string;
};

export type ProjectAgentOption = ConversationAgent & {
  projectId: string;
  isLead: boolean;
};

export async function loadProjectAgentOptions(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  projectIds?: string[],
): Promise<ProjectAgentOption[]> {
  let query = supabase
    .from("project_agents")
    .select(
      "project_id, is_lead, agents(id, name, role, icon, color, instructions, creativity, status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("is_lead", { ascending: false });

  if (projectIds?.length) query = query.in("project_id", projectIds);
  const { data } = await query;

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).flatMap((row) => {
    const agent = firstRelation(
      row.agents as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    if (!agent || agent.status !== "active") return [];
    return [
      {
        projectId: String(row.project_id),
        isLead: Boolean(row.is_lead),
        id: String(agent.id),
        name: String(agent.name),
        role: agent.role as ConversationAgent["role"],
        icon: String(agent.icon),
        color: String(agent.color),
        instructions: String(agent.instructions ?? ""),
        creativity: Number(agent.creativity ?? 40),
      },
    ];
  });
}

export async function loadExecutableModels(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<ConversationModel[]> {
  const { data } = await supabase
    .from("ai_models")
    .select(
      "id, display_name, api_identifier, model_kind, provider_id, context_window, max_output_tokens, ai_providers!inner(id, display_name, provider_type, color, status, credential_status, health_status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .in("model_kind", ["chat", "reasoning", "multimodal"])
    .eq("ai_providers.status", "active")
    .eq("ai_providers.credential_status", "configured")
    .in("ai_providers.provider_type", ["openai", "gemini", "openrouter", "openai_compatible"])
    .order("display_name")
    .limit(500);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).flatMap((row) => {
    const provider = firstRelation(
      row.ai_providers as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    if (!provider) return [];
    return [
      {
        id: String(row.id),
        displayName: String(row.display_name),
        apiIdentifier: String(row.api_identifier),
        modelKind: String(row.model_kind),
        providerId: String(row.provider_id),
        providerName: String(provider.display_name),
        providerType: String(provider.provider_type),
        providerColor: String(provider.color),
        contextWindow: row.context_window === null ? null : Number(row.context_window),
        maxOutputTokens:
          row.max_output_tokens === null ? null : Number(row.max_output_tokens),
      },
    ];
  });
}
