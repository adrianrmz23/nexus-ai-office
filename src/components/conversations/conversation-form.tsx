"use client";

import { useMemo, useState } from "react";
import { Bot, Cpu, FolderKanban, MessagesSquare, Users } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type {
  ConversationModel,
  ConversationMode,
} from "@/modules/conversations/domain/conversation";
import type {
  ConversationProjectOption,
  ProjectAgentOption,
} from "@/modules/conversations/application/conversation-queries";

export function ConversationForm({
  action,
  projects,
  agents,
  models,
  initialProjectId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: ConversationProjectOption[];
  agents: ProjectAgentOption[];
  models: ConversationModel[];
  initialProjectId?: string;
}) {
  const validInitialProject = projects.some((project) => project.id === initialProjectId)
    ? initialProjectId ?? ""
    : projects[0]?.id ?? "";
  const [projectId, setProjectId] = useState(validInitialProject);
  const [mode, setMode] = useState<ConversationMode>("individual");
  const projectAgents = useMemo(
    () => agents.filter((agent) => agent.projectId === projectId),
    [agents, projectId],
  );

  return (
    <form action={action} className="space-y-5">
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Punto de partida</div>
        <h2 className="mt-2 text-lg font-semibold text-white">Configura la conversación</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          El proyecto aporta su stack, reglas y equipo. El modelo puede elegirse manualmente o resolverse con las preferencias configuradas.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <FolderKanban className="size-4 text-primary/70" /> Proyecto
            </span>
            <select
              name="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              required
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <MessagesSquare className="size-4 text-primary/70" /> Título
            </span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={140}
              defaultValue="Nueva conversación técnica"
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            />
          </label>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Ejecución</div>
        <h2 className="mt-2 text-lg font-semibold text-white">Agente y modelo</h2>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <Users className="size-4 text-primary/70" /> Modo
            </span>
            <select
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as ConversationMode)}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            >
              <option value="individual">Agente individual</option>
              <option value="team">Equipo coordinado</option>
            </select>
            <span className="block text-[0.7rem] leading-5 text-slate-600">
              {mode === "team"
                ? "El líder responde con el contexto de todo el equipo. Los handoffs reales se incorporarán en la fase multiagente."
                : "Una ejecución directa del especialista seleccionado."}
            </span>
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <Bot className="size-4 text-primary/70" /> Agente
            </span>
            <select
              name="agentId"
              required={mode === "individual"}
              defaultValue={
                mode === "team"
                  ? ""
                  : projectAgents.find((agent) => agent.isLead)?.id ?? projectAgents[0]?.id ?? ""
              }
              key={`${projectId}-${mode}`}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            >
              {mode === "team" && <option value="">Usar líder del proyecto</option>}
              {mode === "individual" && !projectAgents.length && (
                <option value="">Sin agentes asignados</option>
              )}
              {projectAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}{agent.isLead ? " · Líder" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs text-slate-300">
              <Cpu className="size-4 text-primary/70" /> Modelo inicial
            </span>
            <select
              name="modelId"
              defaultValue=""
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
            >
              <option value="">Selección automática</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.providerName} — {model.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!projectAgents.length && (
          <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-200/70">
            Este proyecto no tiene agentes activos. Asigna un equipo antes de crear la conversación.
          </div>
        )}

        {!models.length && (
          <div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] px-4 py-3 text-xs leading-5 text-rose-200/70">
            No existe un modelo ejecutable con credencial configurada. Revisa el módulo Modelos IA.
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <FormSubmitButton
          type="submit"
          pendingLabel="Creando conversación..."
          disabled={!projects.length || !projectAgents.length || !models.length}
          className="h-11 px-6"
        >
          Crear conversación
        </FormSubmitButton>
      </div>
    </form>
  );
}
