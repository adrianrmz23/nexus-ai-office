"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AnalyticsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="nexus-panel mx-auto grid min-h-96 max-w-3xl place-items-center rounded-2xl p-8 text-center">
      <div>
        <TriangleAlert className="mx-auto size-8 text-rose-300/70" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">No pudimos cargar la analítica</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground/80">{error.message}</p>
        <Button type="button" className="mt-5" onClick={reset}>Volver a intentar</Button>
      </div>
    </section>
  );
}
