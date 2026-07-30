import { createElement } from "react";
import Link from "next/link";
import { FolderPlus, SearchX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectEmptyStateProps = {
  filtered: boolean;
  canManage: boolean;
};

export function ProjectEmptyState({
  filtered,
  canManage,
}: ProjectEmptyStateProps) {
  const iconElement = createElement(filtered ? SearchX : FolderPlus, {
    className: "size-5 text-primary/80",
    "aria-hidden": true,
  });

  return (
    <section className="nexus-panel mt-5 grid min-h-80 place-items-center rounded-2xl px-6 py-16 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/12 bg-primary/[0.045]">
          {iconElement}
        </div>
        <h2 className="mt-5 text-lg font-semibold text-foreground">
          {filtered ? "No encontramos proyectos" : "La oficina aún no tiene proyectos"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {filtered
            ? "Modifica la búsqueda, el estado o la prioridad para consultar otros proyectos."
            : "Crea el primer proyecto real, asigna su stack y conserva sus instrucciones permanentes en un solo lugar."}
        </p>
        {canManage && !filtered ? (
          <Link
            href="/app/proyectos/nuevo"
            className={cn(buttonVariants(), "mt-6")}
          >
            <FolderPlus />
            Crear primer proyecto
          </Link>
        ) : null}
      </div>
    </section>
  );
}
