import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Blocks,
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  Cpu,
  Fingerprint,
  FolderKanban,
  FolderGit2,
  Layers3,
  MessageSquareText,
  ListTodo,
  PackageOpen,
  ShieldCheck,
  Workflow,
  ChartNoAxesCombined,
  Coins,
  Star,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getIsoTimestampDaysAgo } from "@/lib/server-date";
import { cn } from "@/lib/utils";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Centro de operaciones",
};

const foundations = [
  {
    title: "Identidad visual",
    detail: "Sistema oscuro, accesible y responsive",
    icon: Layers3,
  },
  {
    title: "Autenticación",
    detail: "Registro, confirmación y recuperación",
    icon: Fingerprint,
  },
  {
    title: "Aislamiento de datos",
    detail: "Workspaces protegidos mediante RLS",
    icon: ShieldCheck,
  },
  {
    title: "Base auditable",
    detail: "Cambios críticos registrados por workspace",
    icon: Database,
  },
];

const managementModules = [
  {
    title: "Tecnologías",
    detail: "Catálogo técnico administrable",
    icon: Blocks,
    complete: true,
  },
  {
    title: "Proyectos",
    detail: "Stack, entornos y contexto permanente",
    icon: FolderKanban,
    complete: true,
  },
  {
    title: "Agentes",
    detail: "Especialidades y asignación por proyecto",
    icon: Bot,
    complete: true,
  },
  {
    title: "Modelos IA",
    detail: "Proveedores, capacidades y recomendación",
    icon: Cpu,
    complete: true,
  },
];

export default async function AppDashboardPage() {
  const { supabase, membership } = await requireCurrentWorkspace();
  const recentActivityCutoff = getIsoTimestampDaysAgo(30);
  const [
    technologyCountResult,
    activeTechnologyCountResult,
    projectCountResult,
    activeProjectCountResult,
    providerCountResult,
    activeModelCountResult,
    agentCountResult,
    activeAgentCountResult,
    projectAgentCountResult,
    conversationCountResult,
    completedRunCountResult,
    teamExecutionCountResult,
    completedHandoffCountResult,
    activeTaskCountResult,
    artifactCountResult,
    repositoryCountResult,
    repositoryFileCountResult,
    recentUsageResult,
    recentFeedbackResult,
    activeBudgetResult,
  ] = await Promise.all([
    supabase
      .from("technologies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId),
    supabase
      .from("technologies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("ai_providers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("ai_models")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("project_agents")
      .select("agent_id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "completed"),
    supabase
      .from("team_executions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .in("status", ["completed", "partial"]),
    supabase
      .from("agent_handoffs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "completed"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .in("status", ["backlog", "in_progress", "review"]),
    supabase
      .from("artifacts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .neq("status", "archived"),
    supabase
      .from("project_repositories")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("project_files")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("status", "active"),
    supabase
      .from("model_usage")
      .select("total_tokens, estimated_cost, currency")
      .eq("workspace_id", membership.workspaceId)
      .gte("created_at", recentActivityCutoff)
      .limit(1000),
    supabase
      .from("user_feedback")
      .select("rating, verdict")
      .eq("workspace_id", membership.workspaceId)
      .gte("created_at", recentActivityCutoff)
      .limit(1000),
    supabase
      .from("usage_budgets")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId)
      .eq("is_active", true),
  ]);

  const technologyCount = technologyCountResult.count ?? 0;
  const activeTechnologyCount = activeTechnologyCountResult.count ?? 0;
  const projectCount = projectCountResult.count ?? 0;
  const activeProjectCount = activeProjectCountResult.count ?? 0;
  const providerCount = providerCountResult.count ?? 0;
  const activeModelCount = activeModelCountResult.count ?? 0;
  const agentCount = agentCountResult.count ?? 0;
  const activeAgentCount = activeAgentCountResult.count ?? 0;
  const projectAgentCount = projectAgentCountResult.count ?? 0;
  const conversationCount = conversationCountResult.count ?? 0;
  const completedRunCount = completedRunCountResult.count ?? 0;
  const teamExecutionCount = teamExecutionCountResult.count ?? 0;
  const completedHandoffCount = completedHandoffCountResult.count ?? 0;
  const activeTaskCount = activeTaskCountResult.count ?? 0;
  const artifactCount = artifactCountResult.count ?? 0;
  const repositoryCount = repositoryCountResult.count ?? 0;
  const repositoryFileCount = repositoryFileCountResult.count ?? 0;
  const recentTokenCount = (recentUsageResult.data ?? []).reduce(
    (sum, item) => sum + Number(item.total_tokens ?? 0),
    0,
  );
  const recentFeedback = recentFeedbackResult.data ?? [];
  const recentAverageRating = recentFeedback.length
    ? recentFeedback.reduce((sum, item) => sum + Number(item.rating ?? 0), 0) / recentFeedback.length
    : null;
  const acceptedFeedbackCount = recentFeedback.filter((item) => item.verdict === "accepted").length;
  const activeBudgetCount = activeBudgetResult.count ?? 0;

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="nexus-kicker">Estado de construcción</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            La oficina ya administra trabajo real.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            La base segura, los proyectos, agentes y modelos ya ejecutan conversaciones reales.
            El modo equipo delega subtareas verificables y ahora cada resultado puede convertirse
            en tareas, artefactos versionados, decisiones y soluciones con trazabilidad completa.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/12 bg-primary/[0.04] px-4 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#55e6c1]" />
          <div>
            <div className="text-xs font-semibold text-foreground">
              Núcleo operativo
            </div>
            <div className="mt-1 font-mono text-[0.58rem] text-primary/70">
              ONLINE
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tecnologías",
            value: technologyCount,
            detail: `${activeTechnologyCount} activas`,
            icon: Blocks,
          },
          {
            label: "Proyectos",
            value: projectCount,
            detail: `${activeProjectCount} activos`,
            icon: FolderKanban,
          },
          {
            label: "Modelos IA",
            value: activeModelCount,
            detail: `${providerCount} proveedores activos`,
            icon: Cpu,
          },
          {
            label: "Agentes",
            value: agentCount,
            detail: `${activeAgentCount} activos · ${projectAgentCount} asignaciones`,
            icon: Bot,
          },
          {
            label: "Conversaciones",
            value: conversationCount,
            detail: `${completedRunCount} ejecuciones completadas`,
            icon: MessageSquareText,
          },
          {
            label: "Handoffs",
            value: completedHandoffCount,
            detail: `${teamExecutionCount} ejecuciones de equipo`,
            icon: Workflow,
          },
          {
            label: "Tareas activas",
            value: activeTaskCount,
            detail: "Backlog, ejecución y revisión",
            icon: ListTodo,
          },
          {
            label: "Artefactos",
            value: artifactCount,
            detail: "Entregables versionados",
            icon: PackageOpen,
          },
          {
            label: "Repositorios",
            value: repositoryCount,
            detail: `${repositoryFileCount} archivos de código`,
            icon: FolderGit2,
          },
          {
            label: "Tokens · 30 días",
            value: recentTokenCount.toLocaleString("es-MX"),
            detail: `${activeBudgetCount} presupuestos activos`,
            icon: Coins,
          },
          {
            label: "Calidad observada",
            value: recentAverageRating === null ? "—" : recentAverageRating.toFixed(1),
            detail: `${acceptedFeedbackCount}/${recentFeedback.length} resultados aceptados`,
            icon: Star,
          },
        ].map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground/80 uppercase">
                {item.label}
              </div>
              {createElement(item.icon, {
                className: "size-4 text-primary/60",
                "aria-hidden": true,
              })}
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">{item.detail}</div>
          </article>
        ))}
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Fundamentos
              </div>
              <div className="mt-1 text-xs text-muted-foreground/80">
                Base segura y mantenible
              </div>
            </div>
            <span className="font-mono text-xs text-primary">4 / 4</span>
          </div>

          <div className="mt-5 space-y-2">
            {foundations.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5"
              >
                <div className="grid size-9 place-items-center rounded-lg border border-border bg-muted/45">
                  {createElement(item.icon, {
                    className: "size-4 text-primary/85",
                    "aria-hidden": true,
                  })}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground/80">
                    {item.detail}
                  </div>
                </div>
                <CheckCircle2 className="size-4 text-primary/80" />
              </div>
            ))}
          </div>
        </section>

        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Gestión principal
              </div>
              <div className="mt-1 text-xs text-muted-foreground/80">
                Catálogos conectados con datos reales
              </div>
            </div>
            <span className="font-mono text-xs text-primary">4 / 4</span>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {managementModules.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-border bg-muted/25 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="grid size-9 place-items-center rounded-lg border border-border bg-muted/45">
                    {createElement(item.icon, {
                      className: cn(
                        "size-4",
                        item.complete ? "text-primary/85" : "text-muted-foreground/60",
                      ),
                      "aria-hidden": true,
                    })}
                  </div>
                  {item.complete ? (
                    <CheckCircle2 className="size-4 text-primary/75" />
                  ) : (
                    <CircleDashed className="size-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="mt-4 text-sm font-medium text-foreground">
                  {item.title}
                </div>
                <div className="mt-2 text-xs leading-5 text-muted-foreground/80">
                  {item.detail}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
            <Link
              href="/app/proyectos"
              className={buttonVariants({ variant: "secondary" })}
            >
              <FolderKanban />
              Abrir proyectos
            </Link>
            <Link
              href="/app/agentes"
              className={buttonVariants({ variant: "outline" })}
            >
              <Bot />
              Abrir agentes
            </Link>
            <Link
              href="/app/tecnologias"
              className={buttonVariants({ variant: "outline" })}
            >
              <Blocks />
              Abrir tecnologías
            </Link>
            <Link
              href="/app/modelos"
              className={buttonVariants({ variant: "outline" })}
            >
              <Cpu />
              Abrir modelos IA
            </Link>
            <Link
              href="/app/conversaciones"
              className={buttonVariants()}
            >
              <MessageSquareText />
              Abrir conversaciones
            </Link>
            <Link
              href="/app/tareas"
              className={buttonVariants({ variant: "outline" })}
            >
              <ListTodo />
              Abrir tareas
            </Link>
            <Link
              href="/app/artefactos"
              className={buttonVariants({ variant: "outline" })}
            >
              <PackageOpen />
              Abrir artefactos
            </Link>
            <Link
              href="/app/repositorios"
              className={buttonVariants({ variant: "outline" })}
            >
              <FolderGit2 />
              Abrir repositorios
            </Link>
            <Link
              href="/app/analitica"
              className={buttonVariants({ variant: "outline" })}
            >
              <ChartNoAxesCombined />
              Abrir analítica
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
