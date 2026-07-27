import Link from "next/link";
import { ArrowLeft, Blocks, Save } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PROJECT_ICONS,
  PROJECT_ICON_LABELS,
  PROJECT_PRIORITIES,
  PROJECT_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectIconName,
  type ProjectPriority,
  type ProjectStatus,
} from "@/modules/projects/domain/project";

type TechnologyChoice = {
  id: string;
  name: string;
  category: string;
  version: string | null;
  status: "active" | "inactive";
  color: string;
};

type ProjectFormValues = {
  name: string;
  clientName: string;
  description: string;
  icon: ProjectIconName;
  color: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  repositoryUrl: string;
  productionUrl: string;
  stagingUrl: string;
  permanentInstructions: string;
  projectRules: string;
  conventions: string;
  budgetAmount: string;
  budgetCurrency: string;
  technologyIds: string[];
};

type ProjectFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  projectId?: string;
  technologies: TechnologyChoice[];
  initialValues?: Partial<ProjectFormValues>;
  mode: "create" | "edit";
};

const DEFAULT_VALUES: ProjectFormValues = {
  name: "",
  clientName: "",
  description: "",
  icon: "folder-kanban",
  color: "#55e6c1",
  status: "planning",
  priority: "medium",
  repositoryUrl: "",
  productionUrl: "",
  stagingUrl: "",
  permanentInstructions: "",
  projectRules: "",
  conventions: "",
  budgetAmount: "",
  budgetCurrency: "MXN",
  technologyIds: [],
};

const editableStatuses = [
  "planning",
  "active",
  "paused",
  "completed",
] as const;

export function ProjectForm({
  action,
  error,
  projectId,
  technologies,
  initialValues,
  mode,
}: ProjectFormProps) {
  const values = { ...DEFAULT_VALUES, ...initialValues };
  const selectedTechnologyIds = new Set(values.technologyIds);

  return (
    <form action={action} className="space-y-6">
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}

      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Identidad del proyecto</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Información principal
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Define cómo se identificará el proyecto dentro de la oficina y qué
            prioridad tendrá para los agentes.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={values.name}
              placeholder="Ej. Tienda Shopify Integro"
              autoFocus={mode === "create"}
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Cliente opcional</Label>
            <Input
              id="clientName"
              name="clientName"
              defaultValue={values.clientName}
              placeholder="Ej. Integro"
              maxLength={120}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              placeholder="Explica el objetivo, alcance y estado actual del proyecto."
              maxLength={3000}
              className="min-h-32"
            />
            <p className="text-xs leading-5 text-slate-600">
              No incluyas contraseñas, claves privadas, tokens ni contenido de
              archivos .env.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Ícono</Label>
            <select
              id="icon"
              name="icon"
              defaultValue={values.icon}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
              required
            >
              {PROJECT_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {PROJECT_ICON_LABELS[icon]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color de identificación</Label>
            <div className="flex items-center gap-3 rounded-lg border border-input bg-white/[0.025] px-3 py-2">
              <input
                id="color"
                name="color"
                type="color"
                defaultValue={values.color}
                className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Color de identificación del proyecto"
              />
              <span className="font-mono text-xs text-slate-500">
                Se usará en tarjetas, actividad y relaciones.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              defaultValue={values.status}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
              required
            >
              {editableStatuses.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
              {values.status === "archived" ? (
                <option value="archived">
                  {PROJECT_STATUS_LABELS.archived}
                </option>
              ) : null}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select
              id="priority"
              name="priority"
              defaultValue={values.priority}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
              required
            >
              {PROJECT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PROJECT_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.045]">
            <Blocks className="size-4 text-primary/80" />
          </div>
          <div>
            <div className="nexus-kicker">Stack técnico</div>
            <h2 className="mt-2 text-base font-semibold text-slate-100">
              Tecnologías asignadas
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              El equipo de agentes utilizará esta selección para especializar
              recomendaciones, contexto y herramientas.
            </p>
          </div>
        </div>

        {technologies.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {technologies.map((technology) => (
              <label
                key={technology.id}
                className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3.5 transition-colors hover:border-primary/20 hover:bg-primary/[0.025]"
              >
                <input
                  type="checkbox"
                  name="technologyIds"
                  value={technology.id}
                  defaultChecked={selectedTechnologyIds.has(technology.id)}
                  className="mt-0.5 size-4 accent-[#55e6c1]"
                />
                <span
                  className="mt-0.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: technology.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {technology.name}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {technology.version ? `${technology.version} · ` : ""}
                    {technology.status === "inactive" ? "Inactiva" : technology.category}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] bg-black/10 p-5">
            <p className="text-sm leading-6 text-slate-500">
              Todavía no hay tecnologías disponibles. Puedes guardar el proyecto
              sin stack y asignarlo después, o registrar primero el catálogo.
            </p>
            <Link
              href="/app/tecnologias/nueva"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
            >
              Crear tecnología
            </Link>
          </div>
        )}
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Accesos y presupuesto</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Entornos del proyecto
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registra únicamente enlaces descriptivos. Las credenciales y secretos
            deberán almacenarse más adelante en el módulo seguro de proveedores.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="repositoryUrl">Repositorio</Label>
            <Input
              id="repositoryUrl"
              name="repositoryUrl"
              type="url"
              defaultValue={values.repositoryUrl}
              placeholder="https://github.com/..."
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productionUrl">Producción</Label>
            <Input
              id="productionUrl"
              name="productionUrl"
              type="url"
              defaultValue={values.productionUrl}
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stagingUrl">Staging</Label>
            <Input
              id="stagingUrl"
              name="stagingUrl"
              type="url"
              defaultValue={values.stagingUrl}
              placeholder="https://staging..."
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetAmount">Presupuesto operativo opcional</Label>
            <Input
              id="budgetAmount"
              name="budgetAmount"
              inputMode="decimal"
              defaultValue={values.budgetAmount}
              placeholder="Ej. 1500.00"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetCurrency">Moneda</Label>
            <select
              id="budgetCurrency"
              name="budgetCurrency"
              defaultValue={values.budgetCurrency}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
            >
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar estadounidense</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Contexto permanente</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Reglas para los agentes
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Esta información se conservará como contexto estructurado del
            proyecto. No será mezclada con otros proyectos del workspace.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="permanentInstructions">Instrucciones permanentes</Label>
            <Textarea
              id="permanentInstructions"
              name="permanentInstructions"
              defaultValue={values.permanentInstructions}
              placeholder="Ej. Entregar siempre archivos completos y revisar el código existente antes de proponer cambios."
              maxLength={10000}
              className="min-h-40 font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectRules">Reglas y restricciones</Label>
            <Textarea
              id="projectRules"
              name="projectRules"
              defaultValue={values.projectRules}
              placeholder="Ej. No modificar la configuración de pagos sin aprobación."
              maxLength={10000}
              className="min-h-36 font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conventions">Convenciones técnicas</Label>
            <Textarea
              id="conventions"
              name="conventions"
              defaultValue={values.conventions}
              placeholder="Ej. TypeScript estricto, componentes pequeños y nombres de archivos en kebab-case."
              maxLength={10000}
              className="min-h-36 font-mono text-xs"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={projectId ? `/app/proyectos/${projectId}` : "/app/proyectos"}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <ArrowLeft />
          Cancelar
        </Link>
        <FormSubmitButton type="submit" className="gap-2" pendingLabel="Guardando...">
          <Save />
          {mode === "create" ? "Crear proyecto" : "Guardar cambios"}
        </FormSubmitButton>
      </div>
    </form>
  );
}
