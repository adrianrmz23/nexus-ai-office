import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  Download,
  Gauge,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
  Star,
  TimerReset,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import { AnalyticsSettingsForm, BudgetManagement } from "@/components/analytics/analytics-forms";
import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadAnalyticsDashboard,
  loadAnalyticsProjects,
} from "@/modules/analytics/application/analytics-queries";
import { analyticsFiltersSchema } from "@/modules/analytics/domain/analytics-schema";
import {
  FEEDBACK_VERDICT_LABELS,
  type AnalyticsRange,
} from "@/modules/analytics/domain/analytics";
import { MODEL_TASK_LABELS, type ModelTaskType } from "@/modules/models/domain/model";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Analítica operativa" };

const rangeLabels: Record<AnalyticsRange, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  all: "Todo el historial",
};

function compactNumber(value: number): string {
  return new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDuration(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)} s`;
  return `${(value / 60_000).toFixed(1)} min`;
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null) return "Pendiente";
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("es-MX")} ${currency}`;
  }
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(minutes >= 600 ? 0 : 1)} h`;
}

function rating(value: number | null): string {
  return value === null ? "Sin evaluar" : `${value.toFixed(1)} / 5`;
}

function statusTone(state: "ok" | "warning" | "exceeded" | "unknown") {
  if (state === "exceeded") return "border-rose-400/20 bg-rose-400/[0.05] text-rose-200";
  if (state === "warning") return "border-amber-300/20 bg-amber-300/[0.05] text-amber-100";
  if (state === "ok") return "border-primary/15 bg-primary/[0.04] text-primary";
  return "border-border bg-muted/30 text-muted-foreground";
}

function budgetStateLabel(state: "ok" | "warning" | "exceeded" | "unknown"): string {
  if (state === "exceeded") return "Excedido";
  if (state === "warning") return "Alerta";
  if (state === "ok") return "En control";
  return "Incompleto";
}

type Props = {
  searchParams: Promise<{
    range?: string;
    project?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsed = analyticsFiltersSchema.safeParse({
    range: params.range ?? "30d",
    projectId: params.project ?? "",
  });
  const filters = parsed.success
    ? parsed.data
    : { range: "30d" as const, projectId: null };
  const { supabase, membership } = await requireCurrentWorkspace();
  const [projects, data] = await Promise.all([
    loadAnalyticsProjects(supabase, membership.workspaceId),
    loadAnalyticsDashboard(supabase, membership.workspaceId, filters),
  ]);

  const summary = data.summary;
  const maxDailyRuns = Math.max(1, ...data.daily.map((item) => item.runs));
  const knownCostEntries = Object.entries(summary.knownCostByCurrency);
  const selectedProject = filters.projectId
    ? projects.find((project) => project.id === filters.projectId)
    : null;
  const canManage = membership.role === "owner" || membership.role === "admin";

  const metricCards = [
    {
      label: "Ejecuciones",
      value: summary.runCount.toLocaleString("es-MX"),
      detail: `${summary.completedRuns} completadas · ${summary.failedRuns} fallidas`,
      icon: Activity,
    },
    {
      label: "Tasa de éxito",
      value: `${summary.successRate}%`,
      detail: `${summary.cancelledRuns} canceladas`,
      icon: CheckCircle2,
    },
    {
      label: "Tokens",
      value: compactNumber(summary.totalTokens),
      detail: `${compactNumber(summary.inputTokens)} entrada · ${compactNumber(summary.outputTokens)} salida`,
      icon: Gauge,
    },
    {
      label: `Costo en ${data.settings.displayCurrency}`,
      value: formatMoney(summary.displayCost, data.settings.displayCurrency),
      detail: summary.unknownCostRuns
        ? `${summary.unknownCostRuns} usos sin costo calculable`
        : "Todos los usos tienen costo conocido",
      icon: Coins,
    },
    {
      label: "Duración promedio",
      value: formatDuration(summary.averageDurationMs),
      detail: `P95 ${formatDuration(summary.p95DurationMs)}`,
      icon: Clock3,
    },
    {
      label: "Calificación",
      value: rating(summary.averageRating),
      detail: summary.acceptanceRate === null
        ? "Aún no hay feedback"
        : `${summary.acceptanceRate}% aceptadas`,
      icon: Star,
    },
    {
      label: "Tiempo ahorrado",
      value: formatHours(summary.estimatedMinutesSaved),
      detail: `${summary.feedbackCount} resultados evaluados`,
      icon: TimerReset,
    },
    {
      label: "Recomendaciones",
      value: summary.recommendationCount.toLocaleString("es-MX"),
      detail: summary.overrideRate === null
        ? "Sin historial"
        : `${summary.overrideRate}% cambiadas manualmente`,
      icon: Sparkles,
    },
    {
      label: "Handoffs",
      value: summary.handoffCount.toLocaleString("es-MX"),
      detail: `${summary.teamExecutionCount} equipos · ${summary.partialTeamExecutions} parciales`,
      icon: Workflow,
    },
    {
      label: "Correcciones",
      value: summary.correctionCount.toLocaleString("es-MX"),
      detail: `${summary.feedbackCount} resultados evaluados`,
      icon: RefreshCcw,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Inteligencia operativa</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Analítica, costos y calidad
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Mide ejecuciones, modelos, agentes, presupuestos y retroalimentación real. Los costos desconocidos permanecen visibles como pendientes; NEXUS no inventa precios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/analytics/export?range=${filters.range}${filters.projectId ? `&project=${filters.projectId}` : ""}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            <Download /> Exportar CSV
          </Link>
          <Link href="/app/modelos/recomendador" className={buttonVariants()}>
            <Sparkles /> Abrir recomendador
          </Link>
        </div>
      </div>

      <div className="mt-5">
        <FormMessage success={params.success} error={params.error} />
      </div>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="analytics-range" className="text-xs text-muted-foreground">Periodo</label>
            <select id="analytics-range" name="range" defaultValue={filters.range} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
              {Object.entries(rangeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="analytics-project" className="text-xs text-muted-foreground">Proyecto</label>
            <select id="analytics-project" name="project" defaultValue={filters.projectId ?? ""} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
              <option value="">Toda la oficina</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <button type="submit" className={buttonVariants({ size: "lg" })}><RefreshCcw />Aplicar filtros</button>
        </form>
        <div className="mt-3 text-[0.65rem] text-muted-foreground/80">
          Vista actual: {rangeLabels[filters.range]} · {selectedProject?.name ?? "todos los proyectos"}
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground/80 uppercase">{item.label}</div>
              <item.icon className="size-4 text-primary/60" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{item.value}</div>
            <div className="mt-1 text-xs text-muted-foreground/80">{item.detail}</div>
          </article>
        ))}
      </section>

      {(summary.unknownCostRuns > 0 || !data.settings.usdToDisplayRate) && (
        <section className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-sm leading-6 text-amber-100/70">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            {summary.unknownCostRuns > 0 && <p>{summary.unknownCostRuns} ejecuciones no tienen precios revisados o una conversión disponible.</p>}
            {!data.settings.usdToDisplayRate && data.settings.displayCurrency !== "USD" && <p>Configura manualmente el tipo de cambio USD → {data.settings.displayCurrency} para visualizar costos convertidos. NEXUS no consulta ni inventa una tasa automática.</p>}
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-foreground">Actividad por día</div>
              <div className="mt-1 text-xs text-muted-foreground/80">Ejecuciones terminadas y fallidas en el periodo</div>
            </div>
            <ChartNoAxesCombined className="size-5 text-primary/55" />
          </div>
          {data.daily.length ? (
            <div className="nexus-scrollbar mt-6 flex min-h-52 items-end gap-2 overflow-x-auto pb-2">
              {data.daily.map((point) => (
                <div key={point.date} className="flex min-w-10 flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1 rounded-lg border border-border bg-muted/45 px-1.5 pt-2">
                    <div className="w-2.5 rounded-t bg-primary/65" style={{ height: `${Math.max(4, (point.completed / maxDailyRuns) * 100)}%` }} title={`${point.completed} completadas`} />
                    <div className="w-2.5 rounded-t bg-rose-400/55" style={{ height: `${point.failed ? Math.max(4, (point.failed / maxDailyRuns) * 100) : 0}%` }} title={`${point.failed} fallidas`} />
                  </div>
                  <div className="text-center font-mono text-[0.52rem] text-muted-foreground/60">{point.date.slice(5)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid min-h-52 place-items-center text-sm text-muted-foreground/80">Aún no existen ejecuciones en este periodo.</div>
          )}
        </section>

        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Costos originales</div>
              <div className="mt-1 text-xs text-muted-foreground/80">Sin conversiones implícitas</div>
            </div>
            <CircleDollarSign className="size-5 text-primary/55" />
          </div>
          <div className="mt-5 space-y-2">
            {knownCostEntries.length ? knownCostEntries.map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between rounded-xl border border-border bg-muted/45 px-3.5 py-3">
                <span className="text-xs text-muted-foreground">{currency}</span>
                <span className="text-sm font-semibold text-foreground">{formatMoney(amount, currency)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground/80">Todavía no existen costos calculables.</p>}
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground/80">
            Los precios dependen del catálogo administrable de modelos. Actualiza la fecha de revisión cuando cambies una tarifa.
          </div>
        </section>
      </div>

      {data.budgets.length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2"><Coins className="size-4 text-primary/65" /><h2 className="text-sm font-semibold text-foreground">Estado de presupuestos mensuales</h2></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.budgets.map((budget) => (
              <article key={budget.id} className={cn("rounded-2xl border p-5", statusTone(budget.state))}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{budget.label}</div>
                  <span className="font-mono text-[0.58rem] uppercase">{budgetStateLabel(budget.state)}</span>
                </div>
                <div className="mt-4 text-2xl font-semibold text-foreground">{formatMoney(budget.currentSpend, budget.currency)}</div>
                <div className="mt-1 text-xs opacity-70">de {formatMoney(budget.limitAmount, budget.currency)}</div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted/55"><div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, budget.percentage ?? 0)}%` }} /></div>
                <div className="mt-2 text-[0.62rem] opacity-70">{budget.percentage === null ? "Costo incompleto" : `${budget.percentage}% utilizado`}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="nexus-panel mt-5 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div><div className="text-sm font-semibold text-foreground">Rendimiento de modelos</div><div className="mt-1 text-xs text-muted-foreground/80">Ejecuciones, calidad observada y puntaje histórico</div></div>
          <Sparkles className="size-5 text-primary/55" />
        </div>
        <div className="nexus-scrollbar overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="border-b border-border text-[0.58rem] tracking-[0.12em] text-muted-foreground/60 uppercase"><tr><th className="px-5 py-3">Modelo</th><th className="px-4 py-3">Runs</th><th className="px-4 py-3">Éxito</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Duración</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Historial</th><th className="px-4 py-3">Recomendado / usado</th></tr></thead>
            <tbody className="divide-y divide-white/[0.045]">
              {data.models.map((model) => (
                <tr key={model.id} className="text-muted-foreground">
                  <td className="px-5 py-4"><div className="font-medium text-foreground">{model.name}</div><div className="mt-1 flex items-center gap-1.5 text-[0.62rem]"><span className="size-1.5 rounded-full" style={{ backgroundColor: model.providerColor }} />{model.providerName}</div></td>
                  <td className="px-4 py-4">{model.runs}</td><td className="px-4 py-4">{model.successRate}%</td><td className="px-4 py-4">{compactNumber(model.inputTokens + model.outputTokens)}</td><td className="px-4 py-4">{model.currency === "MIX" ? "Varias monedas" : formatMoney(model.knownCost, model.currency)}</td><td className="px-4 py-4">{formatDuration(model.averageDurationMs)}</td><td className="px-4 py-4">{rating(model.averageRating)}</td><td className="px-4 py-4"><span className="rounded-full border border-primary/10 bg-primary/[0.035] px-2 py-1 text-primary/75">{model.historyScore}/100</span></td><td className="px-4 py-4">{model.recommendationCount} / {model.selectedCount}</td>
                </tr>
              ))}
              {!data.models.length && <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground/80">No existen datos de modelos en el periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="nexus-panel overflow-hidden rounded-2xl">
          <div className="border-b border-border p-5"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Bot className="size-4 text-primary/65" />Rendimiento de agentes</div></div>
          <div className="divide-y divide-white/[0.045]">
            {data.agents.slice(0, 10).map((agent) => (
              <article key={agent.id} className="flex items-center gap-3 p-4">
                <div className="grid size-9 place-items-center rounded-lg border" style={{ borderColor: `${agent.color}30`, color: agent.color, backgroundColor: `${agent.color}0d` }}><Bot className="size-4" /></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-foreground">{agent.name}</div><div className="mt-1 text-[0.62rem] text-muted-foreground/80">{agent.runs} runs · {agent.handoffsCompleted} handoffs · {agent.successRate}% éxito</div></div>
                <div className="text-right"><div className="text-xs text-secondary-foreground">{rating(agent.averageRating)}</div><div className="mt-1 text-[0.58rem] text-muted-foreground/60">{agent.correctionCount} correcciones</div></div>
              </article>
            ))}
            {!data.agents.length && <div className="p-8 text-center text-sm text-muted-foreground/80">Sin actividad de agentes.</div>}
          </div>
        </section>

        <section className="nexus-panel overflow-hidden rounded-2xl">
          <div className="border-b border-border p-5"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Workflow className="size-4 text-primary/65" />Proyectos operativos</div></div>
          <div className="divide-y divide-white/[0.045]">
            {data.projects.slice(0, 10).map((project) => (
              <article key={project.id} className="flex items-center gap-3 p-4">
                <span className="size-2 rounded-full" style={{ backgroundColor: project.color }} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-foreground">{project.name}</div><div className="mt-1 text-[0.62rem] text-muted-foreground/80">{project.runs} runs · {project.activeTasks} tareas · {project.approvedArtifacts} artefactos aprobados</div></div>
                <div className="text-right"><div className="text-xs text-secondary-foreground">{rating(project.averageRating)}</div><div className="mt-1 text-[0.58rem] text-muted-foreground/60">{project.currency === "MIX" ? "Costo mixto" : formatMoney(project.knownCost, project.currency)}</div></div>
              </article>
            ))}
            {!data.projects.length && <div className="p-8 text-center text-sm text-muted-foreground/80">Sin actividad de proyectos.</div>}
          </div>
        </section>
      </div>

      <section className="nexus-panel mt-5 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
          <div>
            <div className="text-sm font-semibold text-foreground">Rendimiento por proveedor</div>
            <div className="mt-1 text-xs text-muted-foreground/80">Disponibilidad operativa, tokens, costo y latencia observada</div>
          </div>
          <CircleDollarSign className="size-5 text-primary/55" />
        </div>
        <div className="nexus-scrollbar overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-border text-[0.58rem] tracking-[0.12em] text-muted-foreground/60 uppercase">
              <tr><th className="px-5 py-3">Proveedor</th><th className="px-4 py-3">Runs</th><th className="px-4 py-3">Completados</th><th className="px-4 py-3">Fallidos</th><th className="px-4 py-3">Tokens</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Duración</th></tr>
            </thead>
            <tbody className="divide-y divide-white/[0.045]">
              {data.providers.map((provider) => (
                <tr key={provider.id} className="text-muted-foreground">
                  <td className="px-5 py-4"><div className="flex items-center gap-2 font-medium text-foreground"><span className="size-2 rounded-full" style={{ backgroundColor: provider.color }} />{provider.name}</div></td>
                  <td className="px-4 py-4">{provider.runs}</td>
                  <td className="px-4 py-4">{provider.completed}</td>
                  <td className="px-4 py-4">{provider.failed}</td>
                  <td className="px-4 py-4">{compactNumber(provider.inputTokens + provider.outputTokens)}</td>
                  <td className="px-4 py-4">{provider.currency === "MIX" ? "Varias monedas" : formatMoney(provider.knownCost, provider.currency)}</td>
                  <td className="px-4 py-4">{formatDuration(provider.averageDurationMs)}</td>
                </tr>
              ))}
              {!data.providers.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground/80">No existe actividad de proveedores en el periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="nexus-panel mt-5 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5"><div><div className="text-sm font-semibold text-foreground">Historial de recomendaciones</div><div className="mt-1 text-xs text-muted-foreground/80">Modelo sugerido, modelo utilizado y resultado posterior</div></div><MessageSquareText className="size-5 text-primary/55" /></div>
        <div className="nexus-scrollbar overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-border text-[0.58rem] tracking-[0.12em] text-muted-foreground/60 uppercase"><tr><th className="px-5 py-3">Fecha</th><th className="px-4 py-3">Proyecto / tarea</th><th className="px-4 py-3">Recomendado</th><th className="px-4 py-3">Utilizado</th><th className="px-4 py-3">Decisión</th><th className="px-4 py-3">Resultado</th></tr></thead>
            <tbody className="divide-y divide-white/[0.045]">
              {data.recommendationHistory.map((item) => (
                <tr key={item.id} className="text-muted-foreground"><td className="px-5 py-4">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(item.createdAt))}</td><td className="px-4 py-4"><div className="text-secondary-foreground">{item.projectName ?? "Sin proyecto"}</div><div className="mt-1 text-[0.6rem] text-muted-foreground/60">{MODEL_TASK_LABELS[item.taskType as ModelTaskType] ?? item.taskType} · {item.source === "manual" ? "manual" : "chat"}</div></td><td className="px-4 py-4">{item.recommendedModel ?? "—"}<div className="mt-1 text-[0.58rem] text-muted-foreground/60">{item.score ?? "—"}/100 · {item.confidence ?? "—"}%</div></td><td className="px-4 py-4">{item.selectedModel ?? "—"}</td><td className="px-4 py-4">{item.wasOverridden ? <span className="inline-flex items-center gap-1 text-amber-200/70"><ArrowUpRight className="size-3" />Cambiada</span> : <span className="inline-flex items-center gap-1 text-primary/70"><ArrowDownRight className="size-3" />Seguida</span>}</td><td className="px-4 py-4">{item.verdict ? `${FEEDBACK_VERDICT_LABELS[item.verdict]} · ${item.rating}/5` : "Pendiente de feedback"}</td></tr>
              ))}
              {!data.recommendationHistory.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground/80">Las nuevas recomendaciones de chat y del recomendador aparecerán aquí.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {canManage && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <AnalyticsSettingsForm settings={data.settings} />
          <BudgetManagement projects={projects} budgets={data.budgets} defaultCurrency={data.settings.displayCurrency} />
        </div>
      )}
    </div>
  );
}
