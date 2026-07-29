import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaskForm } from "@/components/tasks/task-form";
import { updateTask } from "@/modules/tasks/application/task-actions";
import { loadTaskById, loadTaskFormOptions } from "@/modules/tasks/application/task-queries";
import { taskIdSchema } from "@/modules/tasks/domain/task-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Editar tarea" };
type Props = { params: Promise<{ taskId: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditTaskPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const messages = await searchParams;
  const parsed = taskIdSchema.safeParse(taskId);
  if (!parsed.success) return notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const [task, options] = await Promise.all([
    loadTaskById(supabase, membership.workspaceId, parsed.data),
    loadTaskFormOptions(supabase, membership.workspaceId),
  ]);
  if (!task) return notFound();
  const taskRecord = task;
  return <div className="mx-auto max-w-5xl pb-20 lg:pb-0"><div className="nexus-kicker">Gestión operativa</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Editar tarea</h1><div className="mt-7"><TaskForm action={updateTask} projects={options.projects} agents={options.agents} dependencies={options.dependencies} mode="edit" taskId={taskRecord.id} error={messages.error} initialValues={{ projectId: taskRecord.project_id, title: taskRecord.title, description: taskRecord.description, acceptanceCriteria: taskRecord.acceptance_criteria, status: taskRecord.status, priority: taskRecord.priority, progress: taskRecord.progress, dueDate: taskRecord.due_date ?? "", assignedAgentId: taskRecord.assigned_agent_id ?? "", conversationId: taskRecord.conversation_id ?? "", sourceMessageId: taskRecord.source_message_id ?? "", createdByAgentId: taskRecord.created_by_agent_id ?? "", dependencyIds: taskRecord.dependencies?.map((dependency) => dependency.id) ?? [] }} /></div></div>;
}
