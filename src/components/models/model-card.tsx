import Link from "next/link";
import { BrainCircuit, Edit3 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MODEL_KIND_LABELS,
  MODEL_STATUS_LABELS,
  type AIModelRecord,
} from "@/modules/models/domain/model";

function price(value: number | null, currency: string): string {
  if (value === null) return "Sin revisar";
  return `${value.toLocaleString("es-MX", { maximumFractionDigits: 6 })} ${currency}`;
}
export function ModelCard({ model, canManage }: { model: AIModelRecord; canManage: boolean }) {
  const caps = model.capabilities;
  const capabilityLabels = [
    caps?.supports_reasoning === true ? "Razonamiento" : null,
    caps?.supports_tools === true ? "Herramientas" : null,
    caps?.supports_vision === true ? "Visión" : null,
    caps?.supports_files === true ? "Archivos" : null,
    caps?.supports_streaming === true ? "Streaming" : null,
  ].filter((value): value is string => Boolean(value));
  return (
    <article className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]">
          <BrainCircuit className="size-4 text-primary/75" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-100">{model.display_name}</h3>
            <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[0.62rem] text-slate-500">{MODEL_STATUS_LABELS[model.status]}</span>
          </div>
          <p className="mt-1 truncate font-mono text-[0.65rem] text-slate-600">{model.api_identifier}</p>
          <p className="mt-2 text-xs text-slate-500">{model.provider?.display_name ?? "Proveedor"} · {MODEL_KIND_LABELS[model.model_kind]}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3 text-slate-500">Contexto<br /><span className="mt-1 block text-slate-300">{model.context_window?.toLocaleString("es-MX") ?? "Sin revisar"}</span></div>
        <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3 text-slate-500">Entrada / 1M<br /><span className="mt-1 block text-slate-300">{price(model.input_cost_per_million, model.currency)}</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {capabilityLabels.length ? capabilityLabels.map((label) => <span key={label} className="rounded-full border border-white/[0.055] bg-white/[0.02] px-2.5 py-1 text-[0.62rem] text-slate-500">{label}</span>) : <span className="text-xs text-slate-700">Capacidades pendientes de revisión.</span>}
      </div>
      {canManage ? (
        <Link href={`/app/modelos/${model.id}/editar`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-5")}>
          <Edit3 />Editar evaluación
        </Link>
      ) : null}
    </article>
  );
}
