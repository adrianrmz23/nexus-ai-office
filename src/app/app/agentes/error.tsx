"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AgentsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="nexus-panel mx-auto max-w-2xl rounded-2xl p-8 text-center">
      <h1 className="text-xl font-semibold text-white">No pudimos cargar los agentes</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Revisa la conexión con Supabase y que la migración del Bloque 04 se haya ejecutado.</p>
      <Button type="button" className="mt-6" onClick={reset}>Intentar nuevamente</Button>
    </div>
  );
}
