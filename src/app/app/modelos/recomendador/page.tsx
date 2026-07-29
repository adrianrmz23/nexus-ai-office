import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Coins, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadRecommendationCatalog } from "@/modules/models/application/model-queries";
import { MODEL_TASK_LABELS, MODEL_TASK_TYPES, type ModelTaskType } from "@/modules/models/domain/model";
import { recommendModels } from "@/modules/models/domain/model-recommender";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Recomendador de modelos" };
type Props = { searchParams: Promise<{ project?: string; task?: string; context?: string; budget?: string; speed?: string; reasoning?: string; vision?: string; tools?: string; files?: string }> };
function formatCost(value: number | null, currency: string): string {
  if (value === null) return "Pendiente de revisión";
  return `${value.toLocaleString("es-MX", { maximumFractionDigits: 6 })} ${currency} / 1M`;
}
export default async function RecommenderPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const task = MODEL_TASK_TYPES.includes(params.task as ModelTaskType) ? params.task as ModelTaskType : "coding";
  const budget = ["economy", "balanced", "quality"].includes(params.budget ?? "") ? params.budget as "economy" | "balanced" | "quality" : "balanced";
  const speed = ["fast", "balanced", "quality"].includes(params.speed ?? "") ? params.speed as "fast" | "balanced" | "quality" : "balanced";
  const estimatedContext = Math.max(0, Math.min(2_000_000, Number(params.context ?? 25000) || 0));
  const hasRequest = Boolean(
    params.task ||
      params.project ||
      params.reasoning ||
      params.vision ||
      params.tools ||
      params.files,
  );
  const [projectsResult, weightsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("workspace_id", membership.workspaceId)
      .neq("status", "archived")
      .order("name"),
    supabase
      .from("model_recommendation_weights")
      .select(
        "task_weight, technology_weight, reasoning_weight, context_weight, capability_weight, history_weight, cost_weight, speed_weight, preference_weight",
      )
      .eq("workspace_id", membership.workspaceId)
      .maybeSingle(),
  ]);
  const selectedProjectId = (projectsResult.data ?? []).some(
    (project) => project.id === params.project,
  )
    ? params.project
    : "";
  let technologyIds: string[] = [];
  let preferredModelId: string | null = null;
  if (selectedProjectId) {
    const [technologyResult, preferenceResult] = await Promise.all([
      supabase
        .from("project_technologies")
        .select("technology_id")
        .eq("workspace_id", membership.workspaceId)
        .eq("project_id", selectedProjectId),
      supabase
        .from("project_model_preferences")
        .select("preferred_model_id")
        .eq("workspace_id", membership.workspaceId)
        .eq("project_id", selectedProjectId)
        .maybeSingle(),
    ]);
    technologyIds = (technologyResult.data ?? []).map((item) => item.technology_id);
    preferredModelId = preferenceResult.data?.preferred_model_id ?? null;
  }
  const models = hasRequest
    ? await loadRecommendationCatalog(supabase, membership.workspaceId, {
        taskType: task,
        technologyIds,
      })
    : [];
  const weights = weightsResult.data ? {
    task: weightsResult.data.task_weight,
    technology: weightsResult.data.technology_weight,
    reasoning: weightsResult.data.reasoning_weight,
    context: weightsResult.data.context_weight,
    capability: weightsResult.data.capability_weight,
    history: weightsResult.data.history_weight,
    cost: weightsResult.data.cost_weight,
    speed: weightsResult.data.speed_weight,
    preference: weightsResult.data.preference_weight,
  } : undefined;
  const recommendations = hasRequest ? recommendModels(models, {
    taskType: task,
    technologyIds,
    requiresReasoning: params.reasoning === "on",
    requiresVision: params.vision === "on",
    requiresTools: params.tools === "on",
    requiresFiles: params.files === "on",
    estimatedContextTokens: estimatedContext,
    budgetProfile: budget,
    speedPreference: speed,
    preferredModelId,
  }, weights) : [];
  const main = recommendations[0];
  const other = recommendations.filter((item) => item.model.id !== main?.model.id);
  const economy = [...other].sort((a, b) => {
    const aCost = (a.model.input_cost_per_million ?? 99999) + (a.model.output_cost_per_million ?? 99999);
    const bCost = (b.model.input_cost_per_million ?? 99999) + (b.model.output_cost_per_million ?? 99999);
    return aCost - bCost;
  })[0];
  const quality = other[0];
  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link href="/app/modelos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}><ArrowLeft />Volver a modelos</Link>
      <div className="mt-5"><div className="nexus-kicker">Reglas ponderadas configurables</div><h1 className="mt-3 text-3xl font-semibold text-white">Recomendador de modelos</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Evalúa tarea, stack, contexto, capacidades, costo, velocidad y preferencia. No consume tokens ni ejecuta modelos.</p></div>
      <section className="nexus-panel mt-7 rounded-2xl p-5 sm:p-6"><form className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-2"><label htmlFor="project" className="text-xs text-slate-300">Proyecto</label><select id="project" name="project" defaultValue={selectedProjectId} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="">Sin proyecto específico</option>{(projectsResult.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        <div className="space-y-2"><label htmlFor="task" className="text-xs text-slate-300">Tipo de tarea</label><select id="task" name="task" defaultValue={task} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">{MODEL_TASK_TYPES.map((item) => <option key={item} value={item}>{MODEL_TASK_LABELS[item]}</option>)}</select></div>
        <div className="space-y-2"><label htmlFor="context" className="text-xs text-slate-300">Contexto estimado</label><input id="context" name="context" type="number" min="0" max="2000000" defaultValue={estimatedContext} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground" /></div>
        <div className="space-y-2"><label htmlFor="budget" className="text-xs text-slate-300">Presupuesto</label><select id="budget" name="budget" defaultValue={budget} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="economy">Economía</option><option value="balanced">Equilibrado</option><option value="quality">Máxima calidad</option></select></div>
        <div className="space-y-2"><label htmlFor="speed" className="text-xs text-slate-300">Velocidad</label><select id="speed" name="speed" defaultValue={speed} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="fast">Rápido</option><option value="balanced">Equilibrado</option><option value="quality">Priorizar calidad</option></select></div>
        <div className="grid grid-cols-2 gap-2">{[["reasoning", "Razonamiento"], ["vision", "Visión"], ["tools", "Herramientas"], ["files", "Archivos"]].map(([name, label]) => <label key={name} className="flex items-center gap-2 rounded-lg border border-white/[0.055] px-3 py-2 text-xs text-slate-400"><input type="checkbox" name={name} defaultChecked={params[name as keyof typeof params] === "on"} className="size-4 accent-[#55e6c1]" />{label}</label>)}</div>
        <div className="lg:col-span-3"><button type="submit" className={buttonVariants({ size: "lg" })}><Sparkles />Calcular recomendación</button></div>
      </form></section>
      {hasRequest ? main ? <section className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="nexus-panel rounded-2xl border-primary/15 p-5 sm:p-6"><div className="nexus-kicker">Recomendación principal</div><h2 className="mt-4 text-2xl font-semibold text-white">{main.model.provider?.display_name} — {main.model.display_name}</h2><div className="mt-3 flex gap-2"><span className="rounded-full border border-primary/10 px-3 py-1 text-xs text-primary/80">Puntaje {main.score}/100</span><span className="rounded-full border border-white/[0.06] px-3 py-1 text-xs text-slate-500">Confianza {main.confidence}%</span></div><div className="mt-5 space-y-2">{main.reasons.map((reason) => <p key={reason} className="text-sm leading-6 text-slate-400">• {reason}</p>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.055] bg-black/10 p-4 text-sm text-slate-500">Entrada<br /><span className="text-slate-200">{formatCost(main.model.input_cost_per_million, main.model.currency)}</span></div><div className="rounded-xl border border-white/[0.055] bg-black/10 p-4 text-sm text-slate-500">Salida<br /><span className="text-slate-200">{formatCost(main.model.output_cost_per_million, main.model.currency)}</span></div></div></article>
        <div className="space-y-4"><article className="nexus-panel rounded-2xl p-5"><Coins className="size-4 text-primary/70" /><div className="mt-3 text-xs text-slate-600">Alternativa económica</div><div className="mt-2 text-sm font-semibold text-slate-200">{economy ? `${economy.model.provider?.display_name} — ${economy.model.display_name}` : "No disponible"}</div></article><article className="nexus-panel rounded-2xl p-5"><Sparkles className="size-4 text-primary/70" /><div className="mt-3 text-xs text-slate-600">Alternativa de calidad</div><div className="mt-2 text-sm font-semibold text-slate-200">{quality ? `${quality.model.provider?.display_name} — ${quality.model.display_name}` : "No disponible"}</div></article></div>
      </section> : <div className="nexus-panel mt-5 rounded-2xl p-8 text-center text-sm text-slate-600">No existe un modelo activo compatible con todos los requisitos conocidos.</div> : null}
    </div>
  );
}
