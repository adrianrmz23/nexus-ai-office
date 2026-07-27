import { createElement } from "react";
import Link from "next/link";
import { Archive, Edit3, ExternalLink, Power, RotateCcw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { cn } from "@/lib/utils";
import { setAgentStatus } from "@/modules/agents/application/agent-actions";
import {
  AGENT_ROLE_LABELS,
  AGENT_SCOPE_LABELS,
  AGENT_STATUS_LABELS,
  getAgentIcon,
  type AgentRecord,
  type AgentTechnologyRecord,
} from "@/modules/agents/domain/agent";

type AgentCardProps = {
  agent: AgentRecord;
  technologies: AgentTechnologyRecord[];
  projectCount: number;
  canManage: boolean;
};

export function AgentCard({
  agent,
  technologies,
  projectCount,
  canManage,
}: AgentCardProps) {
  const icon = createElement(getAgentIcon(agent.icon), {
    className: "size-5",
    "aria-hidden": true,
  });
  const visibleTechnologies = technologies.slice(0, 4);
  const remaining = Math.max(0, technologies.length - visibleTechnologies.length);

  return (
    <article className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-xl border"
          style={{
            color: agent.color,
            borderColor: `${agent.color}30`,
            backgroundColor: `${agent.color}0f`,
          }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-100">
              {agent.name}
            </h2>
            {agent.agent_kind === "system" ? (
              <span className="rounded-full border border-violet-400/10 bg-violet-400/[0.04] px-2 py-1 text-[0.6rem] text-violet-300/75">
                Sistema
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[0.6rem]",
                agent.status === "active" &&
                  "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300/75",
                agent.status === "inactive" &&
                  "border-amber-400/10 bg-amber-400/[0.04] text-amber-300/75",
                agent.status === "archived" &&
                  "border-slate-400/10 bg-slate-400/[0.04] text-slate-500",
              )}
            >
              {AGENT_STATUS_LABELS[agent.status]}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            {AGENT_ROLE_LABELS[agent.role]} · {AGENT_SCOPE_LABELS[agent.scope]}
          </div>
        </div>
      </div>

      <p className="mt-5 min-h-12 text-sm leading-6 text-slate-500">
        {agent.description || "Todavía no se ha agregado una descripción."}
      </p>

      <div className="mt-4 flex min-h-7 flex-wrap gap-1.5">
        {visibleTechnologies.length > 0 ? (
          <>
            {visibleTechnologies.map(({ technology }) => (
              <span
                key={technology.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.055] bg-white/[0.025] px-2.5 py-1 font-mono text-[0.58rem] text-slate-500"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: technology.color }}
                />
                {technology.name}
              </span>
            ))}
            {remaining > 0 ? (
              <span className="rounded-full border border-white/[0.055] bg-white/[0.025] px-2.5 py-1 font-mono text-[0.58rem] text-slate-600">
                +{remaining}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-slate-700">Sin tecnologías asignadas</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.055] pt-4">
        <div className="text-xs text-slate-600">
          {projectCount} {projectCount === 1 ? "proyecto activo" : "proyectos activos"}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/app/agentes/${agent.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink />
            Abrir
          </Link>

          {canManage ? (
            <>
              <Link
                href={`/app/agentes/${agent.id}/editar`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <Edit3 />
                Editar
              </Link>

              {agent.status === "archived" ? (
                <form action={setAgentStatus}>
                  <input type="hidden" name="agentId" value={agent.id} />
                  <input type="hidden" name="status" value="active" />
                  <FormSubmitButton
                    type="submit"
                    size="sm"
                    variant="ghost"
                    pendingLabel="Restaurando..."
                  >
                    <RotateCcw />
                    Restaurar
                  </FormSubmitButton>
                </form>
              ) : (
                <>
                  <form action={setAgentStatus}>
                    <input type="hidden" name="agentId" value={agent.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={agent.status === "active" ? "inactive" : "active"}
                    />
                    <FormSubmitButton
                      type="submit"
                      size="sm"
                      variant="ghost"
                      pendingLabel="Actualizando..."
                    >
                      {agent.status === "active" ? <Power /> : <RotateCcw />}
                      {agent.status === "active" ? "Desactivar" : "Activar"}
                    </FormSubmitButton>
                  </form>

                  <form action={setAgentStatus}>
                    <input type="hidden" name="agentId" value={agent.id} />
                    <input type="hidden" name="status" value="archived" />
                    <ConfirmSubmitButton
                      type="submit"
                      size="sm"
                      variant="ghost"
                      confirmationMessage={`¿Archivar ${agent.name}? Se retirará de los equipos activos, pero conservará su historial.`}
                    >
                      <Archive />
                      Archivar
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
