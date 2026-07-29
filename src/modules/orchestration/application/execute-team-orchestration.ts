import type {
  ChatCompletionResponse,
  ModelAdapter,
} from "@/core/ai/contracts";
import type { createClient } from "@/lib/supabase/server";
import { AGENT_ROLE_LABELS } from "@/modules/agents/domain/agent";
import { estimateModelCost } from "@/modules/conversations/application/usage";
import type {
  ChatStreamEvent,
  ConversationAgent,
  ConversationTeamAgent,
} from "@/modules/conversations/domain/conversation";
import type { ModelTaskType } from "@/modules/models/domain/model";
import {
  buildFallbackTeamPlan,
  hardenTeamExecutionPlan,
  parseTeamExecutionPlan,
  summarizeAgentOutput,
  type TeamExecutionPlan,
} from "@/modules/orchestration/domain/team-plan";
import {
  buildConsolidationMessages,
  buildPlanningMessages,
  buildSpecialistMessages,
  type OrchestrationProjectContext,
} from "@/modules/orchestration/application/team-prompts";

export type OrchestrationRuntimeModel = {
  id: string;
  apiIdentifier: string;
  displayName: string;
  providerId: string;
  providerName: string;
  currency: string;
  inputCostPerMillion: number | null;
  outputCostPerMillion: number | null;
  maxOutputTokens: number | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type TeamAgent = ConversationAgent & { isLead: boolean };

type UsageAccumulator = {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  knownCostCount: number;
};

export type TeamOrchestrationResult = {
  executionId: string;
  finalResponse: ChatCompletionResponse;
  content: string;
  finishReason: string | null;
  durationMs: number;
  finalDurationMs: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  totalEstimatedCost: number | null;
  currency: string;
  completedHandoffs: number;
  failedHandoffs: number;
};

function publicAgent(agent: TeamAgent): ConversationTeamAgent {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    color: agent.color,
  };
}

function usageCost(
  response: ChatCompletionResponse,
  model: OrchestrationRuntimeModel,
): number | null {
  return estimateModelCost({
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    inputCostPerMillion: model.inputCostPerMillion,
    outputCostPerMillion: model.outputCostPerMillion,
  });
}

function accumulateUsage(
  total: UsageAccumulator,
  response: ChatCompletionResponse,
  cost: number | null,
) {
  total.inputTokens += response.usage.inputTokens ?? 0;
  total.outputTokens += response.usage.outputTokens ?? 0;
  if (cost !== null) {
    total.estimatedCost += cost;
    total.knownCostCount += 1;
  }
}

async function insertModelUsage(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  projectId: string;
  conversationId: string;
  runId: string;
  model: OrchestrationRuntimeModel;
  response: ChatCompletionResponse;
  cost: number | null;
  durationMs: number;
  userId: string;
}) {
  await input.supabase.from("model_usage").insert({
    workspace_id: input.workspaceId,
    project_id: input.projectId,
    conversation_id: input.conversationId,
    run_id: input.runId,
    provider_id: input.model.providerId,
    model_id: input.model.id,
    input_tokens: input.response.usage.inputTokens,
    output_tokens: input.response.usage.outputTokens,
    total_tokens: input.response.usage.totalTokens,
    estimated_cost: input.cost,
    currency: input.model.currency,
    duration_ms: input.durationMs,
    created_by: input.userId,
  });
}

function isCancellation(_error: unknown, signal: AbortSignal): boolean {
  return signal.aborted;
}

function stripGeneratedAttributionSections(content: string): string {
  const lines = content.split("\n");
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const normalized = heading[1]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const attributionHeading =
        normalized.includes("responsabil") ||
        normalized.includes("particip") ||
        normalized.includes("especialistas") ||
        normalized.includes("equipo involucrado") ||
        normalized.includes("equipo que intervino");
      skipping = attributionHeading;
      if (skipping) continue;
    }

    if (!skipping) kept.push(line);
  }

  return kept.join("\n").trim();
}

function buildVerifiedParticipationSection(
  contributions: Array<{ agent: TeamAgent; objective: string; output: string; status: "completed" | "failed" }>,
): string {
  const completed = contributions.filter((item) => item.status === "completed");
  if (!completed.length) return "";

  const rows = completed.map(
    (item) =>
      `- **${item.agent.name}** (${AGENT_ROLE_LABELS[item.agent.role]}): ${item.objective}`,
  );

  return `## Participación verificada\n\n${rows.join("\n")}`;
}

function normalizeConsolidatedContent(
  content: string,
  contributions: Array<{ agent: TeamAgent; objective: string; output: string; status: "completed" | "failed" }>,
): string {
  const body = stripGeneratedAttributionSections(content);
  const verified = buildVerifiedParticipationSection(contributions);
  return [body || "No se obtuvo contenido consolidado.", verified]
    .filter(Boolean)
    .join("\n\n");
}

function emitBufferedContent(input: {
  content: string;
  signal: AbortSignal;
  emit: (event: ChatStreamEvent) => void;
}) {
  const chunkSize = 96;
  for (let index = 0; index < input.content.length; index += chunkSize) {
    if (input.signal.aborted) throw new Error("La consolidación fue cancelada.");
    input.emit({ type: "delta", text: input.content.slice(index, index + chunkSize) });
  }
}

function createStepDeadline(parentSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();
  parentSignal.addEventListener("abort", abortFromParent, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose() {
      clearTimeout(timeout);
      parentSignal.removeEventListener("abort", abortFromParent);
    },
  };
}

export async function executeTeamOrchestration(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  projectId: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  rootRunId: string;
  userId: string;
  taskType: ModelTaskType;
  userRequest: string;
  currentUserContent: string;
  recentHistory: Array<{ role: "user" | "assistant"; content: string }>;
  project: OrchestrationProjectContext;
  leader: TeamAgent;
  team: TeamAgent[];
  model: OrchestrationRuntimeModel;
  adapter: ModelAdapter;
  signal: AbortSignal;
  emit: (event: ChatStreamEvent) => void;
}): Promise<TeamOrchestrationResult> {
  const maximumHandoffs = Math.min(3, Math.max(1, input.team.length - 1));
  const executionStartedAt = Date.now();
  const total: UsageAccumulator = {
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    knownCostCount: 0,
  };

  const { data: execution, error: executionError } = await input.supabase
    .from("team_executions")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      conversation_id: input.conversationId,
      user_message_id: input.userMessageId,
      assistant_message_id: input.assistantMessageId,
      root_run_id: input.rootRunId,
      leader_agent_id: input.leader.id,
      status: "planning",
      task_type: input.taskType,
      max_handoffs: maximumHandoffs,
      initiated_by: input.userId,
    })
    .select("id")
    .single();

  if (executionError || !execution) {
    throw new Error("No pudimos iniciar la ejecución coordinada del equipo.");
  }

  await input.supabase
    .from("agent_runs")
    .update({
      team_execution_id: execution.id,
      run_kind: "consolidation",
      step_index: maximumHandoffs + 1,
      step_title: "Consolidación final del líder",
    })
    .eq("id", input.rootRunId);

  let plan: TeamExecutionPlan;
  const planningStartedAt = Date.now();
  const { data: planningRun, error: planningRunError } = await input.supabase
    .from("agent_runs")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      conversation_id: input.conversationId,
      user_message_id: input.userMessageId,
      assistant_message_id: input.assistantMessageId,
      agent_id: input.leader.id,
      model_id: input.model.id,
      provider_id: input.model.providerId,
      mode: "team",
      task_type: input.taskType,
      status: "running",
      started_at: new Date(planningStartedAt).toISOString(),
      initiated_by: input.userId,
      parent_run_id: input.rootRunId,
      team_execution_id: execution.id,
      run_kind: "planning",
      step_index: 0,
      step_title: "Plan operativo del orquestador",
      input_summary: input.userRequest.slice(0, 6000),
    })
    .select("id")
    .single();

  if (planningRunError || !planningRun) {
    throw new Error("No pudimos registrar el plan del orquestador.");
  }

  const planningDeadline = createStepDeadline(input.signal, 25_000);
  try {
    const planningResponse = await input.adapter.complete({
      model: input.model.apiIdentifier,
      messages: buildPlanningMessages({
        project: input.project,
        leader: input.leader,
        availableAgents: input.team,
        userRequest: input.userRequest,
        maximumSteps: maximumHandoffs,
      }),
      temperature: 0.15,
      maxOutputTokens: 1_500,
      signal: planningDeadline.signal,
    });
    const planningDuration = Date.now() - planningStartedAt;
    const planningCost = usageCost(planningResponse, input.model);
    accumulateUsage(total, planningResponse, planningCost);

    const proposedPlan =
      parseTeamExecutionPlan({
        raw: planningResponse.content,
        agents: input.team,
        maximumSteps: maximumHandoffs,
      }) ??
      buildFallbackTeamPlan({
        taskType: input.taskType,
        agents: input.team,
        maximumSteps: maximumHandoffs,
        userRequest: input.userRequest,
      });

    plan = hardenTeamExecutionPlan({
      plan: proposedPlan,
      taskType: input.taskType,
      agents: input.team,
      maximumSteps: maximumHandoffs,
      userRequest: input.userRequest,
    });

    await Promise.all([
      input.supabase
        .from("agent_runs")
        .update({
          status: "completed",
          input_tokens: planningResponse.usage.inputTokens,
          output_tokens: planningResponse.usage.outputTokens,
          estimated_cost: planningCost,
          currency: input.model.currency,
          completed_at: new Date().toISOString(),
          duration_ms: planningDuration,
          output_content: planningResponse.content,
          output_summary: plan.summary,
        })
        .eq("id", planningRun.id),
      insertModelUsage({
        supabase: input.supabase,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        conversationId: input.conversationId,
        runId: planningRun.id,
        model: input.model,
        response: planningResponse,
        cost: planningCost,
        durationMs: planningDuration,
        userId: input.userId,
      }),
    ]);
  } catch (error) {
    if (isCancellation(error, input.signal)) {
      const completedAt = new Date().toISOString();
      await Promise.all([
        input.supabase
          .from("agent_runs")
          .update({
            status: "cancelled",
            error_message: "La planificación fue cancelada.",
            completed_at: completedAt,
            duration_ms: Date.now() - planningStartedAt,
          })
          .eq("id", planningRun.id),
        input.supabase
          .from("team_executions")
          .update({
            status: "cancelled",
            completed_at: completedAt,
            duration_ms: Date.now() - executionStartedAt,
            error_message: "La ejecución fue cancelada durante la planificación.",
          })
          .eq("id", execution.id),
      ]);
      throw error;
    }

    plan = hardenTeamExecutionPlan({
      plan: buildFallbackTeamPlan({
        taskType: input.taskType,
        agents: input.team,
        maximumSteps: maximumHandoffs,
        userRequest: input.userRequest,
      }),
      taskType: input.taskType,
      agents: input.team,
      maximumSteps: maximumHandoffs,
      userRequest: input.userRequest,
    });
    await input.supabase
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: planningDeadline.didTimeout()
          ? "El plan excedió el límite de 25 segundos; se aplicó el respaldo determinista."
          : error instanceof Error
            ? error.message
            : "El plan no pudo generarse.",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - planningStartedAt,
        output_summary: plan.summary,
      })
      .eq("id", planningRun.id);
  } finally {
    planningDeadline.dispose();
  }

  const agentById = new Map(input.team.map((agent) => [agent.id, agent]));
  await input.supabase
    .from("team_executions")
    .update({
      status: "delegating",
      plan,
      specialist_count: plan.steps.length,
      handoff_count: plan.steps.length,
    })
    .eq("id", execution.id);

  input.emit({
    type: "team_plan",
    executionId: execution.id,
    summary: plan.summary,
    generatedBy: plan.generatedBy,
    steps: plan.steps.flatMap((step) => {
      const target = agentById.get(step.agentId);
      return target
        ? [{ agent: publicAgent(target), objective: step.objective, reason: step.reason }]
        : [];
    }),
  });

  const contributions: Array<{
    agent: TeamAgent;
    objective: string;
    output: string;
    status: "completed" | "failed";
  }> = [];
  let completedHandoffs = 0;
  let failedHandoffs = 0;

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    if (!step) continue;
    const specialist = agentById.get(step.agentId);
    if (!specialist) continue;

    const sequenceNumber = index + 1;
    const startedAt = Date.now();
    const { data: childRun, error: childRunError } = await input.supabase
      .from("agent_runs")
      .insert({
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        conversation_id: input.conversationId,
        user_message_id: input.userMessageId,
        assistant_message_id: input.assistantMessageId,
        agent_id: specialist.id,
        model_id: input.model.id,
        provider_id: input.model.providerId,
        mode: "team",
        task_type: input.taskType,
        status: "running",
        started_at: new Date(startedAt).toISOString(),
        initiated_by: input.userId,
        parent_run_id: input.rootRunId,
        team_execution_id: execution.id,
        run_kind: specialist.role === "qa" ? "review" : "specialist",
        step_index: sequenceNumber,
        step_title: step.objective.slice(0, 180),
        input_summary: `${step.reason}\n${step.expectedOutput}`.slice(0, 6000),
      })
      .select("id")
      .single();

    if (childRunError || !childRun) {
      failedHandoffs += 1;
      contributions.push({
        agent: specialist,
        objective: step.objective,
        output: "No se pudo registrar la ejecución del especialista.",
        status: "failed",
      });
      continue;
    }

    const { data: handoff, error: handoffError } = await input.supabase
      .from("agent_handoffs")
      .insert({
        team_execution_id: execution.id,
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        conversation_id: input.conversationId,
        sequence_number: sequenceNumber,
        source_agent_id: input.leader.id,
        target_agent_id: specialist.id,
        source_run_id: input.rootRunId,
        target_run_id: childRun.id,
        reason: step.reason,
        context_sent: `${step.objective}\n\nEntregable: ${step.expectedOutput}`,
        status: "running",
        model_id: input.model.id,
        provider_id: input.model.providerId,
        started_at: new Date(startedAt).toISOString(),
        created_by: input.userId,
      })
      .select("id")
      .single();

    if (handoffError || !handoff) {
      await input.supabase
        .from("agent_runs")
        .update({
          status: "failed",
          error_message: "No pudimos registrar el handoff.",
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startedAt,
        })
        .eq("id", childRun.id);
      failedHandoffs += 1;
      contributions.push({
        agent: specialist,
        objective: step.objective,
        output: "No se pudo registrar el handoff.",
        status: "failed",
      });
      continue;
    }

    input.emit({
      type: "handoff_started",
      executionId: execution.id,
      handoffId: handoff.id,
      sequenceNumber,
      sourceAgent: publicAgent(input.leader),
      targetAgent: publicAgent(specialist),
      objective: step.objective,
      model: {
        id: input.model.id,
        displayName: input.model.displayName,
        providerName: input.model.providerName,
      },
    });

    const specialistDeadline = createStepDeadline(input.signal, 45_000);
    try {
      const specialistResponse = await input.adapter.complete({
        model: input.model.apiIdentifier,
        messages: buildSpecialistMessages({
          project: input.project,
          specialist,
          leader: input.leader,
          step,
          userRequest: input.currentUserContent,
          recentHistory: input.recentHistory.slice(-6),
        }),
        temperature: Math.min(0.8, Math.max(0, specialist.creativity / 100)),
        maxOutputTokens: Math.min(input.model.maxOutputTokens ?? 4_096, 4_096),
        signal: specialistDeadline.signal,
      });
      const durationMs = Date.now() - startedAt;
      const cost = usageCost(specialistResponse, input.model);
      const resultSummary = summarizeAgentOutput(specialistResponse.content);
      accumulateUsage(total, specialistResponse, cost);
      completedHandoffs += 1;
      contributions.push({
        agent: specialist,
        objective: step.objective,
        output: specialistResponse.content,
        status: "completed",
      });

      await Promise.all([
        input.supabase
          .from("agent_runs")
          .update({
            status: "completed",
            input_tokens: specialistResponse.usage.inputTokens,
            output_tokens: specialistResponse.usage.outputTokens,
            estimated_cost: cost,
            currency: input.model.currency,
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
            output_content: specialistResponse.content,
            output_summary: resultSummary,
          })
          .eq("id", childRun.id),
        input.supabase
          .from("agent_handoffs")
          .update({
            status: "completed",
            result_received: specialistResponse.content,
            input_tokens: specialistResponse.usage.inputTokens,
            output_tokens: specialistResponse.usage.outputTokens,
            estimated_cost: cost,
            currency: input.model.currency,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", handoff.id),
        insertModelUsage({
          supabase: input.supabase,
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          conversationId: input.conversationId,
          runId: childRun.id,
          model: input.model,
          response: specialistResponse,
          cost,
          durationMs,
          userId: input.userId,
        }),
      ]);

      input.emit({
        type: "handoff_completed",
        executionId: execution.id,
        handoffId: handoff.id,
        resultSummary,
        inputTokens: specialistResponse.usage.inputTokens,
        outputTokens: specialistResponse.usage.outputTokens,
        estimatedCost: cost,
        currency: input.model.currency,
        durationMs,
      });
    } catch (error) {
      const cancelled = isCancellation(error, input.signal);
      const durationMs = Date.now() - startedAt;
      const message = specialistDeadline.didTimeout()
        ? "El especialista excedió el límite de 45 segundos."
        : error instanceof Error
          ? error.message
          : "La ejecución del especialista falló.";
      const status = cancelled ? "cancelled" : "failed";

      await Promise.all([
        input.supabase
          .from("agent_runs")
          .update({
            status,
            error_message: message,
            completed_at: new Date().toISOString(),
            duration_ms: durationMs,
          })
          .eq("id", childRun.id),
        input.supabase
          .from("agent_handoffs")
          .update({
            status,
            result_received: message,
            duration_ms: durationMs,
            completed_at: new Date().toISOString(),
          })
          .eq("id", handoff.id),
      ]);

      if (cancelled) {
        await input.supabase
          .from("team_executions")
          .update({
            status: "cancelled",
            total_input_tokens: total.inputTokens || null,
            total_output_tokens: total.outputTokens || null,
            total_estimated_cost:
              total.knownCostCount > 0 ? total.estimatedCost : null,
            currency: input.model.currency,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - executionStartedAt,
            error_message: "La ejecución fue cancelada durante un handoff.",
          })
          .eq("id", execution.id);
        throw error;
      }
      failedHandoffs += 1;
      contributions.push({
        agent: specialist,
        objective: step.objective,
        output: message,
        status: "failed",
      });
      input.emit({
        type: "handoff_failed",
        executionId: execution.id,
        handoffId: handoff.id,
        message,
        durationMs,
      });
    } finally {
      specialistDeadline.dispose();
    }
  }

  await input.supabase
    .from("team_executions")
    .update({ status: "consolidating" })
    .eq("id", execution.id);
  input.emit({ type: "consolidation_started", executionId: execution.id });

  const consolidationStartedAt = Date.now();
  const consolidationDeadline = createStepDeadline(input.signal, 75_000);
  try {
    const completedContributions = contributions
      .filter((item) => item.status === "completed")
      .map((item) => ({
        agent: item.agent,
        objective: item.objective,
        output: item.output,
      }));
    const failedSteps = contributions
      .filter((item) => item.status === "failed")
      .map((item) => ({
        agent: item.agent,
        objective: item.objective,
        message: item.output,
      }));

    const draftResponse = await input.adapter.complete({
      model: input.model.apiIdentifier,
      messages: buildConsolidationMessages({
        project: input.project,
        leader: input.leader,
        plan,
        userRequest: input.currentUserContent,
        recentHistory: input.recentHistory,
        contributions: completedContributions,
        failedSteps,
      }),
      temperature: Math.min(0.55, Math.max(0, input.leader.creativity / 100)),
      maxOutputTokens: Math.min(input.model.maxOutputTokens ?? 8_192, 8_192),
      signal: consolidationDeadline.signal,
    });
    const normalizedContent = normalizeConsolidatedContent(
      draftResponse.content,
      contributions,
    );
    const finalResponse: ChatCompletionResponse = {
      ...draftResponse,
      content: normalizedContent,
    };
    emitBufferedContent({
      content: normalizedContent,
      signal: consolidationDeadline.signal,
      emit: input.emit,
    });

    const finalCost = usageCost(finalResponse, input.model);
    accumulateUsage(total, finalResponse, finalCost);
    const durationMs = Date.now() - executionStartedAt;
    const terminalStatus = failedHandoffs > 0 ? "partial" : "completed";

    await input.supabase
      .from("team_executions")
      .update({
        status: terminalStatus,
        total_input_tokens: total.inputTokens,
        total_output_tokens: total.outputTokens,
        total_estimated_cost:
          total.knownCostCount > 0 ? total.estimatedCost : null,
        currency: input.model.currency,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq("id", execution.id);

    return {
      executionId: execution.id,
      finalResponse,
      content: normalizedContent,
      finishReason: finalResponse.finishReason,
      durationMs,
      finalDurationMs: Date.now() - consolidationStartedAt,
      totalInputTokens: total.inputTokens || null,
      totalOutputTokens: total.outputTokens || null,
      totalEstimatedCost:
        total.knownCostCount > 0 ? total.estimatedCost : null,
      currency: input.model.currency,
      completedHandoffs,
      failedHandoffs,
    };
  } catch (error) {
    const cancelled = isCancellation(error, input.signal);
    const finalError = consolidationDeadline.didTimeout()
      ? new Error("La consolidación excedió el límite de 75 segundos.")
      : error;
    await input.supabase
      .from("team_executions")
      .update({
        status: cancelled ? "cancelled" : "failed",
        total_input_tokens: total.inputTokens || null,
        total_output_tokens: total.outputTokens || null,
        total_estimated_cost:
          total.knownCostCount > 0 ? total.estimatedCost : null,
        currency: input.model.currency,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - executionStartedAt,
        error_message:
          finalError instanceof Error
            ? finalError.message
            : "La consolidación final falló.",
      })
      .eq("id", execution.id);
    throw finalError;
  } finally {
    consolidationDeadline.dispose();
  }
}
