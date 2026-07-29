import type { AgentRole } from "@/modules/agents/domain/agent";

export const TASK_STATUSES = [
  "backlog",
  "in_progress",
  "review",
  "completed",
  "cancelled",
  "archived",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  in_progress: "En progreso",
  review: "En revisión",
  completed: "Completada",
  cancelled: "Cancelada",
  archived: "Archivada",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export type TaskProject = { id: string; name: string; color: string };
export type TaskAgent = {
  id: string;
  name: string;
  role: AgentRole;
  icon: string;
  color: string;
};

export type TaskRecord = {
  id: string;
  workspace_id: string;
  project_id: string;
  conversation_id: string | null;
  source_message_id: string | null;
  assigned_agent_id: string | null;
  created_by_agent_id: string | null;
  title: string;
  description: string;
  acceptance_criteria: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  due_date: string | null;
  completed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  project?: TaskProject;
  assignedAgent?: TaskAgent | null;
  createdByAgent?: TaskAgent | null;
  dependencies?: Array<{ id: string; title: string; status: TaskStatus }>;
  artifactCount?: number;
};

export type TaskProjectOption = TaskProject;
export type TaskAgentOption = TaskAgent & { projectIds: string[] };
export type TaskDependencyOption = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
};
