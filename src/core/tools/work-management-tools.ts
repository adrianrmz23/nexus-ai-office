import { z } from "zod";

import type { NexusTool } from "@/core/tools/contracts";

const createTaskInput = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(20_000).default(""),
  acceptanceCriteria: z.string().max(12_000).default(""),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assignedAgentId: z.string().uuid().nullable().default(null),
});

const createArtifactInput = z.object({
  title: z.string().min(3).max(180),
  artifactType: z.enum([
    "code", "component", "page", "sql", "migration", "adr", "plan",
    "documentation", "report", "checklist", "test_case", "prompt", "other",
  ]),
  content: z.string().min(1).max(300_000),
  language: z.string().max(80).default(""),
  filePath: z.string().max(500).default(""),
});

export const createTaskTool: NexusTool<typeof createTaskInput> = {
  name: "create_task",
  description: "Crea una tarea real vinculada al proyecto y a la conversación actual.",
  schema: createTaskInput,
  requiresHumanConfirmation: true,
  async execute(input, context) {
    const { data, error } = await context.supabase.rpc("create_task_record", {
      p_workspace_id: context.membership.workspaceId,
      p_project_id: context.projectId,
      p_title: input.title,
      p_description: input.description,
      p_acceptance_criteria: input.acceptanceCriteria,
      p_status: "backlog",
      p_priority: input.priority,
      p_progress: 0,
      p_due_date: null,
      p_assigned_agent_id: input.assignedAgentId,
      p_conversation_id: context.conversationId,
      p_source_message_id: context.sourceMessageId,
      p_created_by_agent_id: context.agentId,
      p_dependency_ids: [],
    });
    return error || typeof data !== "string"
      ? { ok: false, message: error?.message ?? "No se pudo crear la tarea.", data: {} }
      : { ok: true, message: "Tarea creada.", data: { taskId: data } };
  },
};

export const createArtifactTool: NexusTool<typeof createArtifactInput> = {
  name: "create_artifact",
  description: "Guarda un artefacto versionado dentro del proyecto actual.",
  schema: createArtifactInput,
  requiresHumanConfirmation: true,
  async execute(input, context) {
    const { data, error } = await context.supabase.rpc("create_artifact_record", {
      p_workspace_id: context.membership.workspaceId,
      p_project_id: context.projectId,
      p_title: input.title,
      p_artifact_type: input.artifactType,
      p_language: input.language,
      p_file_path: input.filePath,
      p_content: input.content,
      p_change_summary: "Creado desde una ejecución de agente.",
      p_task_id: null,
      p_conversation_id: context.conversationId,
      p_source_message_id: context.sourceMessageId,
      p_created_by_agent_id: context.agentId,
    });
    return error || typeof data !== "string"
      ? { ok: false, message: error?.message ?? "No se pudo crear el artefacto.", data: {} }
      : { ok: true, message: "Artefacto creado.", data: { artifactId: data } };
  },
};

export const WORK_MANAGEMENT_TOOLS = [createTaskTool, createArtifactTool] as const;
