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
  TECHNOLOGY_CATEGORIES,
  TECHNOLOGY_CATEGORY_LABELS,
  TECHNOLOGY_ICON_LABELS,
  TECHNOLOGY_ICONS,
  TECHNOLOGY_STATUS_LABELS,
  type TechnologyCategory,
  type TechnologyIconName,
  type TechnologyStatus,
} from "@/modules/technologies/domain/technology";

type TechnologyFormValues = {
  name: string;
  category: TechnologyCategory;
  description: string;
  icon: TechnologyIconName;
  color: string;
  version: string;
  officialDocsUrl: string;
  tags: string;
  technicalPrompt: string;
  status: TechnologyStatus;
};

type TechnologyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  technologyId?: string;
  initialValues?: Partial<TechnologyFormValues>;
  mode: "create" | "edit";
};

const DEFAULT_VALUES: TechnologyFormValues = {
  name: "",
  category: "framework",
  description: "",
  icon: "code-2",
  color: "#55e6c1",
  version: "",
  officialDocsUrl: "",
  tags: "",
  technicalPrompt: "",
  status: "active",
};

export function TechnologyForm({
  action,
  error,
  technologyId,
  initialValues,
  mode,
}: TechnologyFormProps) {
  const values = { ...DEFAULT_VALUES, ...initialValues };

  return (
    <form action={action} className="space-y-6">
      {technologyId ? (
        <input type="hidden" name="technologyId" value={technologyId} />
      ) : null}

      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Identidad técnica</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Información principal
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Estos datos permitirán identificar la tecnología en proyectos,
            agentes y recomendaciones de modelos.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={values.name}
              placeholder="Ej. Next.js"
              autoFocus={mode === "create"}
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <select
              id="category"
              name="category"
              defaultValue={values.category}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
              required
            >
              {TECHNOLOGY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {TECHNOLOGY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              placeholder="Describe para qué se utiliza dentro de tus proyectos."
              maxLength={1200}
            />
            <p className="text-xs leading-5 text-slate-600">
              No incluyas contraseñas, tokens ni información secreta.
            </p>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Clasificación</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Apariencia y versión
          </h2>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="icon">Ícono</Label>
            <select
              id="icon"
              name="icon"
              defaultValue={values.icon}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
              required
            >
              {TECHNOLOGY_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {TECHNOLOGY_ICON_LABELS[icon]}
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
                aria-label="Color de identificación"
              />
              <span className="font-mono text-xs text-slate-500">
                Se usará en tarjetas y relaciones.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Versión de referencia</Label>
            <Input
              id="version"
              name="version"
              defaultValue={values.version}
              placeholder="Ej. 16, 8.4 o latest"
              maxLength={40}
            />
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
              {(["active", "inactive"] as const).map((status) => (
                <option key={status} value={status}>
                  {TECHNOLOGY_STATUS_LABELS[status]}
                </option>
              ))}
              {values.status === "archived" ? (
                <option value="archived">
                  {TECHNOLOGY_STATUS_LABELS.archived}
                </option>
              ) : null}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="officialDocsUrl">Documentación oficial</Label>
            <Input
              id="officialDocsUrl"
              name="officialDocsUrl"
              type="url"
              defaultValue={values.officialDocsUrl}
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="tags">Etiquetas</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={values.tags}
              placeholder="Frontend, SSR, React, TypeScript"
              maxLength={400}
            />
            <p className="text-xs leading-5 text-slate-600">
              Separa las etiquetas con comas. Se guardarán como máximo 12.
            </p>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Contexto permanente</div>
          <h2 className="mt-2 text-base font-semibold text-slate-100">
            Prompt técnico base
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Escribe convenciones útiles que los agentes deberán considerar al
            trabajar con esta tecnología. Este contenido no sustituye las reglas
            específicas de cada proyecto.
          </p>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="technicalPrompt">Instrucciones</Label>
          <Textarea
            id="technicalPrompt"
            name="technicalPrompt"
            defaultValue={values.technicalPrompt}
            placeholder="Ej. Utiliza App Router, TypeScript estricto y Server Components por defecto."
            maxLength={5000}
            className="min-h-40 font-mono text-xs"
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/app/tecnologias"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <ArrowLeft />
          Cancelar
        </Link>
        <FormSubmitButton
          type="submit"
          className="gap-2"
          pendingLabel="Guardando..."
        >
          <Save />
          {mode === "create" ? "Guardar tecnología" : "Guardar cambios"}
        </FormSubmitButton>
      </div>
    </form>
  );
}
