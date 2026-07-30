import Link from "next/link";
import { Bot, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function AgentEmptyState({
  filtered,
  canManage,
}: {
  filtered: boolean;
  canManage: boolean;
}) {
  return (
    <section className="nexus-panel mt-5 rounded-2xl border-dashed p-8 text-center sm:p-12">
      <div className="mx-auto grid size-12 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]">
        <Bot className="size-5 text-primary/75" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">
        {filtered ? "No encontramos agentes" : "No hay agentes registrados"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {filtered
          ? "Ajusta la búsqueda o los filtros para consultar otros especialistas."
          : "Crea un agente personalizado y asígnale tecnologías, herramientas y colaboradores."}
      </p>
      {!filtered && canManage ? (
        <Link
          href="/app/agentes/nuevo"
          className={`${buttonVariants({ size: "lg" })} mt-6`}
        >
          <Plus />
          Crear agente
        </Link>
      ) : null}
    </section>
  );
}
