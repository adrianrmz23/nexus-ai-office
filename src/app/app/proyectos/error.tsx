"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectsErrorProps = {
  reset: () => void;
};

export default function ProjectsError({ reset }: ProjectsErrorProps) {
  return (
    <div className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center pb-20 text-center lg:pb-0">
      <section className="nexus-panel w-full rounded-2xl px-6 py-14">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-rose-400/15 bg-rose-400/[0.05]">
          <AlertTriangle className="size-5 text-rose-300" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-100">
          No pudimos abrir los proyectos
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          Reintenta la consulta. Si el problema continúa, verifica la migración
          del Bloque 03 y la conexión con Supabase.
        </p>
        <Button type="button" onClick={reset} className="mt-6">
          <RotateCcw />
          Reintentar
        </Button>
      </section>
    </div>
  );
}
