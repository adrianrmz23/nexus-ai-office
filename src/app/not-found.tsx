import Link from "next/link";
import { ArrowLeft, Orbit } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="w-full max-w-xl text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
          <Orbit className="size-7" />
        </div>
        <div className="mt-6 font-mono text-xs tracking-[0.2em] text-primary uppercase">Ruta no encontrada</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Esta zona no existe en NEXUS</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          El recurso pudo archivarse, cambiar de dirección o pertenecer a otro workspace.
        </p>
        <Link
          href="/app"
          className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al centro de operaciones
        </Link>
      </section>
    </main>
  );
}
