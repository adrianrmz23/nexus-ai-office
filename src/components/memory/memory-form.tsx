import { BrainCircuit, Save } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MemoryProjectOption } from "@/modules/memory/application/memory-queries";
import {
  MEMORY_TYPE_LABELS,
  MEMORY_TYPES,
} from "@/modules/memory/domain/memory";

export function MemoryForm({
  action,
  projects,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: MemoryProjectOption[];
}) {
  return (
    <form action={action} className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-400/10 bg-violet-400/[0.04] text-violet-300">
          <BrainCircuit className="size-5" />
        </div>
        <div>
          <div className="nexus-kicker">Memoria estructurada</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Guardar una decisión o preferencia
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Conserva únicamente información estable y útil. No guardes secretos ni datos temporales sin valor futuro.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="memory-scope">Alcance</Label>
          <select
            id="memory-scope"
            name="scopeType"
            defaultValue="project"
            className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
          >
            <option value="project">Proyecto</option>
            <option value="global">Global de la oficina</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memory-project">Proyecto</Label>
          <select
            id="memory-project"
            name="projectId"
            defaultValue={projects[0]?.id ?? ""}
            className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
          >
            <option value="">Sin proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memory-type">Tipo</Label>
          <select
            id="memory-type"
            name="memoryType"
            defaultValue="decision"
            className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
          >
            {MEMORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEMORY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memory-importance">Importancia</Label>
          <Input
            id="memory-importance"
            name="importance"
            type="number"
            min={1}
            max={100}
            defaultValue={70}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="memory-title">Título</Label>
          <Input
            id="memory-title"
            name="title"
            required
            maxLength={180}
            placeholder="Ej. Entregar siempre archivos completos"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="memory-content">Contenido</Label>
          <Textarea
            id="memory-content"
            name="content"
            required
            maxLength={12_000}
            className="min-h-36"
            placeholder="Describe la decisión, preferencia, restricción o solución aceptada."
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <FormSubmitButton pendingLabel="Guardando memoria...">
          <Save /> Guardar memoria
        </FormSubmitButton>
      </div>
    </form>
  );
}
