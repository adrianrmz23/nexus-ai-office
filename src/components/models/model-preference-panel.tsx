import { Bot, Save } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import type { ModelOption } from "@/modules/models/application/model-queries";
import type { ModelPreferenceRecord } from "@/modules/models/domain/model";

type Props = {
  title: string;
  description: string;
  action: (formData: FormData) => void | Promise<void>;
  entityField: "agentId" | "projectId";
  entityId: string;
  models: ModelOption[];
  preference?: ModelPreferenceRecord | null;
  mode: "agent" | "project";
  canManage: boolean;
};
export function ModelPreferencePanel({
  title,
  description,
  action,
  entityField,
  entityId,
  models,
  preference,
  mode,
  canManage,
}: Props) {
  return (
    <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.045]"><Bot className="size-4 text-primary/80" /></div>
        <div><div className="nexus-kicker">Estrategia de modelos</div><h2 className="mt-2 text-base font-semibold text-slate-100">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div>
      </div>
      <form action={action} className="mt-5 grid gap-4 lg:grid-cols-[1fr_13rem_13rem_auto] lg:items-end">
        <input type="hidden" name={entityField} value={entityId} />
        <div>
          <label htmlFor={`${entityField}-preferredModelId`} className="mb-2 block text-xs font-medium text-slate-300">Modelo predeterminado</label>
          <select id={`${entityField}-preferredModelId`} name="preferredModelId" defaultValue={preference?.preferred_model_id ?? ""} disabled={!canManage} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground">
            <option value="">Selección automática</option>
            {models.map((model) => <option key={model.id} value={model.id}>{model.providerName} — {model.displayName}</option>)}
          </select>
        </div>
        {mode === "agent" ? (
          <div><label htmlFor="selectionMode" className="mb-2 block text-xs font-medium text-slate-300">Modo</label><select id="selectionMode" name="selectionMode" defaultValue={preference?.selection_mode ?? "automatic"} disabled={!canManage} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="automatic">Automático</option><option value="fixed">Modelo fijo</option></select></div>
        ) : (
          <div><label htmlFor="budgetProfile" className="mb-2 block text-xs font-medium text-slate-300">Presupuesto</label><select id="budgetProfile" name="budgetProfile" defaultValue={preference?.budget_profile ?? "balanced"} disabled={!canManage} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="economy">Economía</option><option value="balanced">Equilibrado</option><option value="quality">Máxima calidad</option></select></div>
        )}
        {mode === "project" ? (
          <div><label htmlFor="speedPreference" className="mb-2 block text-xs font-medium text-slate-300">Velocidad</label><select id="speedPreference" name="speedPreference" defaultValue={preference?.speed_preference ?? "balanced"} disabled={!canManage} className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"><option value="fast">Priorizar velocidad</option><option value="balanced">Equilibrado</option><option value="quality">Priorizar calidad</option></select></div>
        ) : <div className="hidden lg:block" />}
        {canManage ? <FormSubmitButton type="submit" pendingLabel="Guardando..."><Save />Guardar</FormSubmitButton> : null}
        {mode === "agent" && models.length ? (
          <div className="lg:col-span-4">
            <label htmlFor={`${entityField}-alternativeModelIds`} className="mb-2 block text-xs font-medium text-slate-300">Modelos alternativos</label>
            <select id={`${entityField}-alternativeModelIds`} name="alternativeModelIds" multiple size={Math.min(6, Math.max(3, models.length))} defaultValue={preference?.alternative_model_ids ?? []} disabled={!canManage} className="nexus-focus min-h-28 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 py-2 text-sm text-foreground">
              {models.map((model) => <option key={model.id} value={model.id}>{model.providerName} — {model.displayName}</option>)}
            </select>
            <p className="mt-2 text-xs leading-5 text-slate-600">Selecciona hasta cinco alternativas con Ctrl en Windows o Cmd en macOS.</p>
          </div>
        ) : null}
      </form>
      {!models.length ? <p className="mt-4 rounded-xl border border-dashed border-white/[0.08] bg-black/10 p-4 text-sm leading-6 text-slate-600">Todavía no hay modelos activos. Configura un proveedor y sincroniza su catálogo.</p> : null}
    </section>
  );
}
