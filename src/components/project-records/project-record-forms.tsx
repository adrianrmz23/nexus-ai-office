import { Bug, Gavel, Save } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AgentOption = { id: string; name: string };

type SharedProps = {
  projectId: string;
  agents: AgentOption[];
  conversationId?: string;
  sourceMessageId?: string;
  agentId?: string;
};

export function DecisionForm({
  action,
  projectId,
  agents,
  conversationId = "",
  sourceMessageId = "",
  agentId = "",
}: SharedProps & { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="nexus-panel rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="sourceMessageId" value={sourceMessageId} />
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-violet-400/10 bg-violet-400/[0.04]"><Gavel className="size-4 text-violet-300/80" /></div>
        <div>
          <div className="nexus-kicker">ADR ligero</div>
          <h2 className="mt-2 text-base font-semibold text-foreground">Registrar decisión técnica</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="decision-title">Título</Label><Input id="decision-title" name="title" maxLength={180} required placeholder="Ej. Mantener App Router como arquitectura principal" /></div>
        <div className="space-y-2"><Label htmlFor="decision-status">Estado</Label><select id="decision-status" name="status" defaultValue="accepted" className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"><option value="proposed">Propuesta</option><option value="accepted">Aceptada</option><option value="superseded">Reemplazada</option><option value="rejected">Rechazada</option></select></div>
        <div className="space-y-2"><Label htmlFor="decision-agent">Agente relacionado</Label><select id="decision-agent" name="agentId" defaultValue={agentId} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"><option value="">Decisión humana</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="decision-context">Contexto</Label><Textarea id="decision-context" name="context" maxLength={12_000} placeholder="Problema, restricciones y alternativas evaluadas." /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="decision-value">Decisión</Label><Textarea id="decision-value" name="decision" maxLength={16_000} required placeholder="Describe exactamente lo que se decidió." /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="decision-consequences">Consecuencias</Label><Textarea id="decision-consequences" name="consequences" maxLength={12_000} placeholder="Beneficios, costos, riesgos y trabajo posterior." /></div>
      </div>
      <div className="mt-5 flex justify-end"><FormSubmitButton pendingLabel="Guardando decisión..."><Save />Guardar decisión</FormSubmitButton></div>
    </form>
  );
}

export function ErrorSolutionForm({
  action,
  projectId,
  agents,
  conversationId = "",
  sourceMessageId = "",
  agentId = "",
}: SharedProps & { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="nexus-panel rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="sourceMessageId" value={sourceMessageId} />
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-rose-400/10 bg-rose-400/[0.04]"><Bug className="size-4 text-rose-300/80" /></div>
        <div>
          <div className="nexus-kicker">Base de conocimiento</div>
          <h2 className="mt-2 text-base font-semibold text-foreground">Registrar error y solución</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="error-title">Título</Label><Input id="error-title" name="title" maxLength={180} required placeholder="Ej. Error de hidratación al habilitar navegación" /></div>
        <div className="space-y-2"><Label htmlFor="error-status">Estado</Label><select id="error-status" name="status" defaultValue="resolved" className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"><option value="open">Abierto</option><option value="resolved">Resuelto</option><option value="verified">Verificado</option><option value="archived">Archivado</option></select></div>
        <div className="space-y-2"><Label htmlFor="error-agent">Agente relacionado</Label><select id="error-agent" name="agentId" defaultValue={agentId} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"><option value="">Registrado por el usuario</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="error-signature">Firma o mensaje de error</Label><Textarea id="error-signature" name="errorSignature" maxLength={4_000} className="font-mono text-xs" placeholder="Pega el mensaje exacto o una firma estable." /></div>
        <div className="space-y-2"><Label htmlFor="error-symptoms">Síntomas</Label><Textarea id="error-symptoms" name="symptoms" maxLength={12_000} /></div>
        <div className="space-y-2"><Label htmlFor="error-root">Causa raíz</Label><Textarea id="error-root" name="rootCause" maxLength={16_000} /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="error-solution">Solución</Label><Textarea id="error-solution" name="solution" maxLength={24_000} required /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="error-validation">Pasos de validación</Label><Textarea id="error-validation" name="validationSteps" maxLength={12_000} placeholder="Cómo comprobar que la solución no introdujo regresiones." /></div>
      </div>
      <div className="mt-5 flex justify-end"><FormSubmitButton pendingLabel="Guardando solución..."><Save />Guardar error y solución</FormSubmitButton></div>
    </form>
  );
}
