import { FileUp, ShieldAlert } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemoryProjectOption } from "@/modules/memory/application/memory-queries";

export function MemoryUploadForm({
  action,
  projects,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: MemoryProjectOption[];
}) {
  return (
    <form action={action} className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.05] text-primary">
          <FileUp className="size-5" />
        </div>
        <div>
          <div className="nexus-kicker">Documento de contexto</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Agregar archivo
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Los archivos de texto y código se fragmentan e indexan. PDF y ZIP se conservan de forma privada, pero todavía no se extraen automáticamente.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="document-scope">Alcance</Label>
          <select
            id="document-scope"
            name="scopeType"
            defaultValue="project"
            className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground"
          >
            <option value="project">Proyecto</option>
            <option value="global">Global de la oficina</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="document-project">Proyecto</Label>
          <select
            id="document-project"
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="document-title">Título opcional</Label>
          <Input
            id="document-title"
            name="title"
            maxLength={180}
            placeholder="Ej. Arquitectura actual del proyecto"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="memory-file">Archivo</Label>
          <Input
            id="memory-file"
            name="file"
            type="file"
            required
            accept=".txt,.md,.markdown,.json,.sql,.ts,.tsx,.js,.jsx,.php,.liquid,.css,.scss,.html,.htm,.log,.yaml,.yml,.xml,.csv,.toml,.ini,.sh,.ps1,.py,.java,.cs,.go,.rb,.vue,.pdf,.zip,text/*,application/pdf,application/zip,application/json"
          />
          <p className="text-xs leading-5 text-slate-600">
            Máximo 768 KB. Los archivos indexables deben estar en UTF-8.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/10 bg-amber-400/[0.03] px-3.5 py-3 text-xs leading-5 text-amber-200/60">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        NEXUS bloquea archivos .env, llaves privadas y contenido que parezca contener tokens o contraseñas.
      </div>

      <div className="mt-5 flex justify-end">
        <FormSubmitButton pendingLabel="Procesando documento...">
          <FileUp /> Agregar documento
        </FormSubmitButton>
      </div>
    </form>
  );
}
