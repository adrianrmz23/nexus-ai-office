import { createElement } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  CirclePause,
  Edit3,
  RotateCcw,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { cn } from "@/lib/utils";
import { setTechnologyStatus } from "@/modules/technologies/application/technology-actions";
import {
  getTechnologyIcon,
  TECHNOLOGY_CATEGORY_LABELS,
  TECHNOLOGY_STATUS_LABELS,
  type TechnologyRecord,
} from "@/modules/technologies/domain/technology";

type TechnologyCardProps = {
  technology: TechnologyRecord;
  canManage: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function TechnologyCard({
  technology,
  canManage,
}: TechnologyCardProps) {
  return (
    <article className="nexus-panel group rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor: `${technology.color}33`,
            backgroundColor: `${technology.color}12`,
            color: technology.color,
          }}
        >
          {createElement(getTechnologyIcon(technology.icon), {
            className: "size-5",
            "aria-hidden": true,
          })}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">
              {technology.name}
            </h2>
            {technology.version ? (
              <span className="rounded-md border border-border bg-muted/35 px-2 py-0.5 font-mono text-[0.58rem] text-muted-foreground">
                {technology.version}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem]">
            <span className="rounded-full border border-primary/10 bg-primary/[0.04] px-2.5 py-1 text-primary/75">
              {TECHNOLOGY_CATEGORY_LABELS[technology.category]}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1",
                technology.status === "active" &&
                  "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-300/75",
                technology.status === "inactive" &&
                  "border-amber-400/10 bg-amber-400/[0.04] text-amber-300/75",
                technology.status === "archived" &&
                  "border-slate-400/10 bg-slate-400/[0.04] text-muted-foreground",
              )}
            >
              {TECHNOLOGY_STATUS_LABELS[technology.status]}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-5 min-h-12 text-sm leading-6 text-muted-foreground">
        {technology.description ||
          "Todavía no se ha agregado una descripción técnica."}
      </p>

      {technology.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {technology.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted/45 px-2 py-1 font-mono text-[0.58rem] text-muted-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground/60">
          Actualizada {formatDate(technology.updated_at)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {technology.official_docs_url ? (
            <a
              href={technology.official_docs_url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Docs
              <ArrowUpRight />
            </a>
          ) : null}

          {canManage ? (
            <>
              <Link
                href={`/app/tecnologias/${technology.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Edit3 />
                Editar
              </Link>

              {technology.status === "archived" ? (
                <form action={setTechnologyStatus}>
                  <input
                    type="hidden"
                    name="technologyId"
                    value={technology.id}
                  />
                  <input type="hidden" name="status" value="active" />
                  <FormSubmitButton
                    type="submit"
                    variant="secondary"
                    size="sm"
                    pendingLabel="Restaurando..."
                  >
                    <RotateCcw />
                    Restaurar
                  </FormSubmitButton>
                </form>
              ) : (
                <>
                  <form action={setTechnologyStatus}>
                    <input
                      type="hidden"
                      name="technologyId"
                      value={technology.id}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={
                        technology.status === "active" ? "inactive" : "active"
                      }
                    />
                    <FormSubmitButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      pendingLabel="Actualizando..."
                    >
                      {technology.status === "active" ? (
                        <CirclePause />
                      ) : (
                        <RotateCcw />
                      )}
                      {technology.status === "active"
                        ? "Desactivar"
                        : "Activar"}
                    </FormSubmitButton>
                  </form>

                  <form action={setTechnologyStatus}>
                    <input
                      type="hidden"
                      name="technologyId"
                      value={technology.id}
                    />
                    <input type="hidden" name="status" value="archived" />
                    <ConfirmSubmitButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      confirmationMessage={`¿Archivar ${technology.name}? Podrás restaurarla después.`}
                    >
                      <Archive />
                      Archivar
                    </ConfirmSubmitButton>
                  </form>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
