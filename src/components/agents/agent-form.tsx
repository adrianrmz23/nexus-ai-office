import Link from "next/link";
import { ArrowLeft, BrainCircuit, Save, Wrench } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AGENT_ICONS,
  AGENT_ICON_LABELS,
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  AGENT_SCOPES,
  AGENT_SCOPE_LABELS,
  AGENT_STATUS_LABELS,
  AGENT_TOOLS,
  AGENT_TOOL_LABELS,
  type AgentIconName,
  type AgentRole,
  type AgentScope,
  type AgentStatus,
  type AgentTool,
} from "@/modules/agents/domain/agent";

type TechnologyChoice = {
  id: string;
  name: string;
  category: string;
  version: string | null;
  status: "active" | "inactive" | "archived";
  color: string;
};

type CollaboratorChoice = {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
};

type AgentFormValues = {
  name: string;
  description: string;
  role: AgentRole;
  scope: AgentScope;
  icon: AgentIconName;
  color: string;
  avatarUrl: string;
  instructions: string;
  preferredModelKey: string;
  alternativeModelKeys: string;
  creativity: number;
  memoryEnabled: boolean;
  allowedTools: AgentTool[];
  escalationRules: string;
  status: AgentStatus;
  technologyIds: string[];
  collaboratorIds: string[];
};

type AgentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  error?: string;
  agentId?: string;
  initialValues?: Partial<AgentFormValues>;
  mode: "create" | "edit";
  technologies: TechnologyChoice[];
  collaborators: CollaboratorChoice[];
};

const DEFAULT_VALUES: AgentFormValues = {
  name: "",
  description: "",
  role: "custom",
  scope: "global",
  icon: "bot",
  color: "#55e6c1",
  avatarUrl: "",
  instructions: "",
  preferredModelKey: "",
  alternativeModelKeys: "",
  creativity: 25,
  memoryEnabled: true,
  allowedTools: [
    "search_project_files",
    "read_files",
    "create_artifacts",
    "consult_memory",
    "request_review",
  ],
  escalationRules: "",
  status: "active",
  technologyIds: [],
  collaboratorIds: [],
};

export function AgentForm({
  action,
  error,
  agentId,
  initialValues,
  mode,
  technologies,
  collaborators,
}: AgentFormProps) {
  const values = { ...DEFAULT_VALUES, ...initialValues };
  const selectedTechnologyIds = new Set(values.technologyIds);
  const selectedCollaboratorIds = new Set(values.collaboratorIds);
  const selectedTools = new Set(values.allowedTools);

  return (
    <form action={action} className="space-y-6">
      {agentId ? <input type="hidden" name="agentId" value={agentId} /> : null}

      <FormMessage error={error} />

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Identidad operativa</div>
          <h2 className="mt-2 text-base font-semibold text-foreground">
            Perfil del agente
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Define su función, alcance y apariencia. La especialización técnica se
            conectará con los proyectos y el recomendador de equipos.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              defaultValue={values.name}
              placeholder="Ej. Especialista SEO técnico"
              autoFocus={mode === "create"}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol principal</Label>
            <select
              id="role"
              name="role"
              defaultValue={values.role}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
              required
            >
              {AGENT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {AGENT_ROLE_LABELS[role]}
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
              placeholder="Describe qué problemas resuelve y cuándo debe participar."
              maxLength={1800}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Alcance</Label>
            <select
              id="scope"
              name="scope"
              defaultValue={values.scope}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
            >
              {AGENT_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {AGENT_SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              defaultValue={values.status}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
            >
              {(["active", "inactive"] as const).map((status) => (
                <option key={status} value={status}>
                  {AGENT_STATUS_LABELS[status]}
                </option>
              ))}
              {values.status === "archived" ? (
                <option value="archived">{AGENT_STATUS_LABELS.archived}</option>
              ) : null}
            </select>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="nexus-kicker">Representación visual</div>
        <h2 className="mt-2 text-base font-semibold text-foreground">
          Apariencia en la oficina
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="icon">Ícono</Label>
            <select
              id="icon"
              name="icon"
              defaultValue={values.icon}
              className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground transition-colors hover:border-primary/35"
            >
              {AGENT_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {AGENT_ICON_LABELS[icon]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color de identificación</Label>
            <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/35 px-3 py-2">
              <input
                id="color"
                name="color"
                type="color"
                defaultValue={values.color}
                className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Color de identificación del agente"
              />
              <span className="font-mono text-xs text-muted-foreground">
                Se utilizará en actividad, handoffs y equipos.
              </span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="avatarUrl">Avatar externo opcional</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              defaultValue={values.avatarUrl}
              placeholder="https://..."
              maxLength={500}
            />
            <p className="text-xs leading-5 text-muted-foreground/80">
              Si queda vacío, NEXUS utilizará el ícono y color seleccionados.
            </p>
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.045]">
            <BrainCircuit className="size-4 text-primary/80" />
          </div>
          <div>
            <div className="nexus-kicker">Comportamiento</div>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              Instrucciones y memoria
            </h2>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="instructions">Instrucciones principales</Label>
            <Textarea
              id="instructions"
              name="instructions"
              defaultValue={values.instructions}
              placeholder="Define cómo debe analizar, responder, colaborar y validar su trabajo."
              maxLength={15000}
              className="min-h-52 font-mono text-xs"
              required
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="creativity">Creatividad: {values.creativity}/100</Label>
              <input
                id="creativity"
                name="creativity"
                type="range"
                min="0"
                max="100"
                step="1"
                defaultValue={values.creativity}
                className="nexus-focus h-11 w-full accent-[#55e6c1]"
              />
              <p className="text-xs leading-5 text-muted-foreground/80">
                El proveedor traducirá este nivel a sus parámetros compatibles.
              </p>
            </div>

            <label className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/25 p-4">
              <input
                type="checkbox"
                name="memoryEnabled"
                defaultChecked={values.memoryEnabled}
                className="mt-0.5 size-4 accent-[#55e6c1]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Memoria habilitada
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground/80">
                  Podrá consultar y guardar memoria cuando las herramientas y el
                  proyecto lo permitan.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalationRules">Reglas de escalamiento</Label>
            <Textarea
              id="escalationRules"
              name="escalationRules"
              defaultValue={values.escalationRules}
              placeholder="Ej. Solicitar aprobación antes de modificar autenticación, pagos o datos de producción."
              maxLength={5000}
              className="min-h-32 font-mono text-xs"
            />
          </div>
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Especialización</div>
          <h2 className="mt-2 text-base font-semibold text-foreground">
            Tecnologías dominadas
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Estas relaciones alimentan la recomendación de equipos por proyecto.
          </p>
        </div>

        {technologies.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {technologies.map((technology) => (
              <label
                key={technology.id}
                className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/25 p-3.5 transition-colors hover:border-primary/20 hover:bg-primary/[0.025]"
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
                  <span className="block truncate text-sm font-medium text-foreground">
                    {technology.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground/80">
                    {technology.version ? `${technology.version} · ` : ""}
                    {technology.status === "inactive"
                      ? "Inactiva"
                      : technology.category}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground/80">
            Todavía no hay tecnologías disponibles. Podrás asignarlas cuando el
            catálogo tenga registros.
          </p>
        )}
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.045]">
            <Wrench className="size-4 text-primary/80" />
          </div>
          <div>
            <div className="nexus-kicker">Permisos operativos</div>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              Herramientas permitidas
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              La selección define capacidades, no concede acceso automático a
              secretos ni operaciones destructivas.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AGENT_TOOLS.map((tool) => (
            <label
              key={tool}
              className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/25 p-3.5"
            >
              <input
                type="checkbox"
                name="allowedTools"
                value={tool}
                defaultChecked={selectedTools.has(tool)}
                className="mt-0.5 size-4 accent-[#55e6c1]"
              />
              <span className="text-sm leading-5 text-secondary-foreground">
                {AGENT_TOOL_LABELS[tool]}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <div>
          <div className="nexus-kicker">Colaboración</div>
          <h2 className="mt-2 text-base font-semibold text-foreground">
            Handoffs permitidos
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Selecciona agentes a los que podrá transferir contexto cuando el
            orquestador habilite ejecuciones multiagente.
          </p>
        </div>

        {collaborators.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {collaborators.map((collaborator) => (
              <label
                key={collaborator.id}
                className="nexus-focus flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/25 p-3.5"
              >
                <input
                  type="checkbox"
                  name="collaboratorIds"
                  value={collaborator.id}
                  defaultChecked={selectedCollaboratorIds.has(collaborator.id)}
                  className="mt-0.5 size-4 accent-[#55e6c1]"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {collaborator.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground/80">
                    {AGENT_ROLE_LABELS[collaborator.role]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground/80">
            No hay otros agentes disponibles para colaboración.
          </p>
        )}
      </section>

      <section className="nexus-panel rounded-2xl p-5 sm:p-6">
        <input
          type="hidden"
          name="preferredModelKey"
          value={values.preferredModelKey}
        />
        <input
          type="hidden"
          name="alternativeModelKeys"
          value={values.alternativeModelKeys}
        />
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.045]">
              <BrainCircuit className="size-4 text-primary/80" />
            </div>
            <div>
              <div className="nexus-kicker">Estrategia de modelos</div>
              <h2 className="mt-2 text-base font-semibold text-foreground">
                Preferencias desacopladas del agente
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                El modelo principal y sus alternativas se administran desde el perfil
                del agente usando el catálogo real de la oficina.
              </p>
            </div>
          </div>
          {mode === "edit" && agentId ? (
            <Link
              href={`/app/agentes/${agentId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <BrainCircuit />
              Configurar modelos
            </Link>
          ) : (
            <span className="text-xs leading-5 text-muted-foreground/80">
              Guarda el agente para configurar sus modelos.
            </span>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/app/agentes"
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
          {mode === "create" ? "Guardar agente" : "Guardar cambios"}
        </FormSubmitButton>
      </div>
    </form>
  );
}
