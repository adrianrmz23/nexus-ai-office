"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="nexus-panel grid min-h-96 place-items-center rounded-2xl p-8 text-center">
      <div>
        <AlertTriangle className="mx-auto size-8 text-rose-300/70" />
        <h2 className="mt-4 text-lg font-semibold text-slate-200">
          No pudimos cargar las conversaciones
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          La información sigue almacenada. NEXUS recibió un error al recuperar el
          listado o alguna de sus relaciones.
        </p>
        {process.env.NODE_ENV === "development" && error.message ? (
          <pre className="mx-auto mt-4 max-w-2xl overflow-x-auto rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-4 text-left text-xs whitespace-pre-wrap text-rose-200/75">
            {error.message}
          </pre>
        ) : null}
        <Button onClick={reset} className="mt-5">
          Reintentar
        </Button>
      </div>
    </div>
  );
}
