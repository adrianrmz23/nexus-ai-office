import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MODEL_KINDS,
  MODEL_KIND_LABELS,
  MODEL_STATUSES,
  MODEL_STATUS_LABELS,
  MODEL_TASK_LABELS,
  MODEL_TASK_TYPES,
  type AIModelRecord,
  type AIProviderRecord,
} from "@/modules/models/domain/model";

type TechnologyChoice = { id: string; name: string; category: string };
type Props = {
  action: (formData: FormData) => void | Promise<void>;
  providers: AIProviderRecord[];
  technologies: TechnologyChoice[];
  model?: AIModelRecord;
  error?: string;
  mode: "create" | "edit";
};
function scoreValue(value: number | null | undefined): string | number { return value ?? ""; }

export function ModelForm({ action, providers, technologies, model, error, mode }: Props) {
  const caps = model?.capabilities;
  const capabilities = [
    ["supportsReasoning", "Razonamiento", caps?.supports_reasoning],
    ["supportsTools", "Herramientas", caps?.supports_tools],
    ["supportsStreaming", "Streaming", caps?.supports_streaming],
    ["supportsVision", "Visión", caps?.supports_vision],
    ["supportsFiles", "Archivos", caps?.supports_files],
    ["supportsStructuredOutput", "Salida estructurada", caps?.supports_structured_output],
    ["supportsEmbeddings", "Embeddings", caps?.supports_embeddings],
  ] as const;
  const scores = [
    ["reasoningScore", "Razonamiento", caps?.reasoning_score],
    ["codingScore", "Programación", caps?.coding_score],
    ["designScore", "Diseño", caps?.design_score],
    ["visionScore", "Visión", caps?.vision_score],
    ["sqlScore", "SQL", caps?.sql_score],
    ["longContextScore", "Contexto extenso", caps?.long_context_score],
    ["speedScore", "Velocidad", caps?.speed_score],
  ] as const;
  return (
    <form action={action} className="space-y-6">
      {model ? <input type="hidden" name="modelId" value={model.id} /> : null}
      <FormMessage error={error} />
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Identidad del modelo</div><h2 className="mt-2 text-base font-semibold text-slate-100">Registro técnico</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="providerId">Proveedor</Label><select id="providerId" name="providerId" defaultValue={model?.provider_id ?? providers[0]?.id ?? ""} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground" required>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.display_name}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="displayName">Nombre comercial</Label><Input id="displayName" name="displayName" defaultValue={model?.display_name ?? ""} placeholder="Ej. Modelo de programación" maxLength={160} required /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="apiIdentifier">Identificador de API</Label><Input id="apiIdentifier" name="apiIdentifier" defaultValue={model?.api_identifier ?? ""} placeholder="Ej. provider/model-name" maxLength={220} className="font-mono" required /></div>
          <div className="space-y-2"><Label htmlFor="modelKind">Tipo</Label><select id="modelKind" name="modelKind" defaultValue={model?.model_kind ?? "chat"} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">{MODEL_KINDS.map((kind) => <option key={kind} value={kind}>{MODEL_KIND_LABELS[kind]}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="status">Estado</Label><select id="status" name="status" defaultValue={model?.status ?? "active"} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">{MODEL_STATUSES.map((status) => <option key={status} value={status}>{MODEL_STATUS_LABELS[status]}</option>)}</select></div>
        </div>
      </section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Límites y costos</div><h2 className="mt-2 text-base font-semibold text-slate-100">Contexto y presupuesto</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2"><Label htmlFor="contextWindow">Ventana de contexto</Label><Input id="contextWindow" name="contextWindow" type="number" min="1" defaultValue={model?.context_window ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="maxOutputTokens">Salida máxima</Label><Input id="maxOutputTokens" name="maxOutputTokens" type="number" min="1" defaultValue={model?.max_output_tokens ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="inputCostPerMillion">Entrada por 1M</Label><Input id="inputCostPerMillion" name="inputCostPerMillion" type="number" min="0" step="0.000001" defaultValue={model?.input_cost_per_million ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="outputCostPerMillion">Salida por 1M</Label><Input id="outputCostPerMillion" name="outputCostPerMillion" type="number" min="0" step="0.000001" defaultValue={model?.output_cost_per_million ?? ""} /></div>
          <div className="space-y-2"><Label htmlFor="currency">Moneda</Label><Input id="currency" name="currency" defaultValue={model?.currency ?? "USD"} maxLength={3} className="uppercase" /></div>
          <div className="space-y-2"><Label htmlFor="lastReviewedAt">Última revisión</Label><Input id="lastReviewedAt" name="lastReviewedAt" type="date" defaultValue={model?.last_reviewed_at ?? ""} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="pricingNotes">Notas de precios</Label><Input id="pricingNotes" name="pricingNotes" defaultValue={model?.pricing_notes ?? ""} maxLength={3000} /></div>
        </div>
      </section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Capacidades</div><h2 className="mt-2 text-base font-semibold text-slate-100">Compatibilidad operativa</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {capabilities.map(([name, label, value]) => <div key={name} className="space-y-2"><Label htmlFor={name}>{label}</Label><select id={name} name={name} defaultValue={value === true ? "true" : value === false ? "false" : ""} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="">Desconocido</option><option value="true">Compatible</option><option value="false">No compatible</option></select></div>)}
        </div>
      </section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Evaluación interna</div><h2 className="mt-2 text-base font-semibold text-slate-100">Puntuaciones de capacidad</h2><p className="mt-2 text-sm text-slate-500">Usa valores de 0 a 100 y deja vacío lo no validado.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{scores.map(([name, label, value]) => <div key={name} className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" min="0" max="100" defaultValue={scoreValue(value)} /></div>)}</div>
      </section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Tipos de tarea</div><h2 className="mt-2 text-base font-semibold text-slate-100">Afinidad operativa</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{MODEL_TASK_TYPES.map((task) => <div key={task} className="space-y-2"><Label htmlFor={`taskScore_${task}`}>{MODEL_TASK_LABELS[task]}</Label><Input id={`taskScore_${task}`} name={`taskScore_${task}`} type="number" min="0" max="100" defaultValue={scoreValue(model?.taskScores?.[task])} /></div>)}</div></section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Afinidad tecnológica</div><h2 className="mt-2 text-base font-semibold text-slate-100">Tecnologías recomendadas</h2>{technologies.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{technologies.map((technology) => <div key={technology.id} className="space-y-2"><Label htmlFor={`technologyScore_${technology.id}`}>{technology.name}</Label><Input id={`technologyScore_${technology.id}`} name={`technologyScore_${technology.id}`} type="number" min="0" max="100" defaultValue={scoreValue(model?.technologyScores?.[technology.id])} placeholder={technology.category} /></div>)}</div> : <p className="mt-4 text-sm text-slate-600">No hay tecnologías activas.</p>}</section>
      <section className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="space-y-2"><Label htmlFor="notes">Notas internas</Label><Textarea id="notes" name="notes" defaultValue={model?.notes ?? ""} maxLength={5000} className="min-h-32" /></div></section>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/app/modelos" className={cn(buttonVariants({ variant: "outline" }))}><ArrowLeft />Cancelar</Link><FormSubmitButton type="submit" pendingLabel="Guardando..."><Save />{mode === "create" ? "Crear modelo" : "Guardar cambios"}</FormSubmitButton></div>
    </form>
  );
}
