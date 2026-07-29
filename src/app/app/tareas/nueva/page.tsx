import type { Metadata } from "next";

import { TaskForm } from "@/components/tasks/task-form";
import { loadSourceMessage } from "@/modules/artifacts/application/artifact-queries";
import { createTask } from "@/modules/tasks/application/task-actions";
import { loadTaskFormOptions } from "@/modules/tasks/application/task-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nueva tarea" };

type Props = { searchParams: Promise<{ project?: string; conversation?: string; message?: string; error?: string }> };

function titleFromContent(content: string): string {
  const first = content.split("\n").map((line) => line.replace(/^#+\s*/, "").replace(/[*`]/g, "").trim()).find(Boolean) ?? "Tarea desde conversación";
  return first.slice(0, 180);
}

export default async function NewTaskPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [options, source] = await Promise.all([
    loadTaskFormOptions(supabase, membership.workspaceId),
    params.message ? loadSourceMessage(supabase, membership.workspaceId, params.message) : Promise.resolve(null),
  ]);
  const projectId = source?.projectId ?? params.project ?? options.projects[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Nueva unidad de trabajo</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Crear tarea</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">La tarea puede originarse manualmente o conservar la trazabilidad de una respuesta de agente.</p>
      <div className="mt-7">
        <TaskForm
          action={createTask}
          projects={options.projects}
          agents={options.agents}
          dependencies={options.dependencies}
          mode="create"
          error={params.error}
          initialValues={{
            projectId,
            title: source ? titleFromContent(source.content) : "",
            description: source?.content ?? "",
            acceptanceCriteria: "",
            status: "backlog",
            priority: "medium",
            progress: 0,
            dueDate: "",
            assignedAgentId: source?.agentId ?? "",
            conversationId: source?.conversationId ?? params.conversation ?? "",
            sourceMessageId: source?.id ?? "",
            createdByAgentId: source?.agentId ?? "",
            dependencyIds: [],
          }}
        />
      </div>
    </div>
  );
}
