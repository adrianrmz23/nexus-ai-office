"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function MemoryError({ reset }: { reset: () => void }) {
  return (
    <section className="nexus-panel mx-auto grid min-h-80 max-w-3xl place-items-center rounded-2xl p-8 text-center">
      <div>
        <AlertTriangle className="mx-auto size-8 text-amber-300/70" />
        <h1 className="mt-4 text-xl font-semibold text-slate-100">
          No pudimos cargar la memoria
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Verifica que ejecutaste la migración del Bloque 07 y vuelve a intentarlo.
        </p>
        <Button className="mt-5" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </section>
  );
}
