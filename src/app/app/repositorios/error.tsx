"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RepositoriesError({ error, reset }: { error: Error; reset: () => void }) {
  return <div className="nexus-panel mx-auto grid min-h-80 max-w-3xl place-items-center rounded-2xl p-8 text-center"><div><AlertTriangle className="mx-auto size-8 text-rose-500" /><h1 className="mt-4 text-xl font-semibold text-foreground">No pudimos cargar los repositorios</h1><p className="mt-2 text-sm text-muted-foreground">{error.message}</p><Button className="mt-5" onClick={reset}>Intentar de nuevo</Button></div></div>;
}
