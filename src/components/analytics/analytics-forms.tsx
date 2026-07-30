import { CircleDollarSign, Save, Settings2, Trash2 } from "lucide-react";

import {
  disableUsageBudget,
  saveAnalyticsSettings,
  saveUsageBudget,
} from "@/modules/analytics/application/analytics-actions";
import type {
  AnalyticsSettings,
  BudgetStatus,
} from "@/modules/analytics/domain/analytics";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AnalyticsSettingsForm({ settings }: { settings: AnalyticsSettings }) {
  return (
    <details className="nexus-panel rounded-2xl p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]">
          <Settings2 className="size-4 text-primary/75" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Configuración analítica</div>
          <div className="mt-1 text-xs text-muted-foreground/80">Moneda de visualización y estimación de tiempo ahorrado</div>
        </div>
      </summary>
      <form action={saveAnalyticsSettings} className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="displayCurrency">Moneda visible</Label>
          <Input id="displayCurrency" name="displayCurrency" defaultValue={settings.displayCurrency} maxLength={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usdToDisplayRate">1 USD equivale a</Label>
          <Input id="usdToDisplayRate" name="usdToDisplayRate" type="number" min="0.000001" step="0.000001" defaultValue={settings.usdToDisplayRate ?? ""} placeholder="Configura el tipo de cambio" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acceptedMinutesSaved">Minutos: aceptada</Label>
          <Input id="acceptedMinutesSaved" name="acceptedMinutesSaved" type="number" min={0} max={1440} defaultValue={settings.acceptedMinutesSaved} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partialMinutesSaved">Minutos: parcial</Label>
          <Input id="partialMinutesSaved" name="partialMinutesSaved" type="number" min={0} max={1440} defaultValue={settings.partialMinutesSaved} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rejectedMinutesSaved">Minutos: rechazada</Label>
          <Input id="rejectedMinutesSaved" name="rejectedMinutesSaved" type="number" min={0} max={1440} defaultValue={settings.rejectedMinutesSaved} />
        </div>
        <div className="sm:col-span-2 xl:col-span-5">
          <FormSubmitButton pendingLabel="Guardando configuración..."><Save />Guardar configuración</FormSubmitButton>
        </div>
      </form>
    </details>
  );
}

export function BudgetManagement({
  projects,
  budgets,
  defaultCurrency,
}: {
  projects: Array<{ id: string; name: string }>;
  budgets: BudgetStatus[];
  defaultCurrency: string;
}) {
  return (
    <details className="nexus-panel rounded-2xl p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]">
          <CircleDollarSign className="size-4 text-primary/75" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">Presupuestos mensuales</div>
          <div className="mt-1 text-xs text-muted-foreground/80">Límite global o independiente por proyecto</div>
        </div>
      </summary>
      <form action={saveUsageBudget} className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="budgetProjectId">Alcance</Label>
          <select id="budgetProjectId" name="projectId" className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">
            <option value="">Toda la oficina</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="limitAmount">Límite mensual</Label>
          <Input id="limitAmount" name="limitAmount" type="number" min="0.0001" step="0.0001" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetCurrency">Moneda</Label>
          <Input id="budgetCurrency" name="currency" defaultValue={defaultCurrency} maxLength={3} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="warningThreshold">Alerta al (%)</Label>
          <Input id="warningThreshold" name="warningThreshold" type="number" min={1} max={100} defaultValue={80} required />
        </div>
        <div className="sm:col-span-2 xl:col-span-4">
          <FormSubmitButton pendingLabel="Guardando presupuesto..."><Save />Guardar presupuesto</FormSubmitButton>
        </div>
      </form>

      {budgets.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-border pt-5">
          {budgets.map((budget) => (
            <div key={budget.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/45 p-3.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{budget.label}</div>
                <div className="mt-1 text-xs text-muted-foreground/80">{budget.limitAmount.toLocaleString("es-MX")} {budget.currency} · alerta {budget.warningThreshold}%</div>
              </div>
              <form action={disableUsageBudget}>
                <input type="hidden" name="budgetId" value={budget.id} />
                <ConfirmSubmitButton
                  variant="ghost"
                  size="sm"
                  confirmationMessage="¿Desactivar este presupuesto? El historial de consumo se conservará."
                  pendingLabel="Desactivando..."
                >
                  <Trash2 /> Desactivar
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
