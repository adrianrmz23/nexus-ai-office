"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        event: "global_render_error",
        message: error.message,
        digest: error.digest ?? null,
      }),
    );
  }, [error]);

  return (
    <html lang="es">
      <body className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <main className="w-full max-w-xl rounded-2xl border border-border bg-card p-7 shadow-xl">
          <div className="grid size-12 place-items-center rounded-xl border border-destructive/20 bg-destructive/8 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">NEXUS encontró un error inesperado</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            La operación fue detenida para proteger el estado de la aplicación. Puedes volver a intentar sin perder los datos que ya estaban guardados.
          </p>
          {error.digest ? (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
              Referencia: {error.digest}
            </div>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <RotateCcw className="size-4" /> Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
