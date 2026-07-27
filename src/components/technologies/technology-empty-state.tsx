import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TechnologyEmptyStateProps = {
  filtered: boolean;
  canManage: boolean;
};

export function TechnologyEmptyState({
  filtered,
  canManage,
}: TechnologyEmptyStateProps) {
  return (
    <section className="nexus-panel mt-5 grid min-h-80 place-items-center rounded-2xl px-6 py-16 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/12 bg-primary/[0.045]">
          <Sparkles className="size-5 text-primary/80" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-100">
          {filtered
            ? "No encontramos coincidencias"
            : "El catálogo todavía está vacío"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {filtered
            ? "Modifica los filtros para consultar otras tecnologías."
            : "Registra la primera tecnología real de tu oficina para comenzar a construir proyectos especializados."}
        </p>
        {canManage && !filtered ? (
          <Link
            href="/app/tecnologias/nueva"
            className={cn(buttonVariants(), "mt-6")}
          >
            <Plus />
            Crear primera tecnología
          </Link>
        ) : null}
      </div>
    </section>
  );
}
