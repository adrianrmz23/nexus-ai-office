import { FileSearch, Sparkles } from "lucide-react";

import type { RetrievedMemorySource } from "@/modules/memory/domain/memory";

export function RetrievalResults({
  query,
  sources,
}: {
  query: string;
  sources: RetrievedMemorySource[];
}) {
  if (!query) return null;

  return (
    <section className="nexus-panel mt-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <FileSearch className="size-4 text-primary/70" />
        <div className="nexus-kicker">Prueba de recuperación textual</div>
      </div>
      <h2 className="mt-2 text-base font-semibold text-foreground">
        Resultados para “{query}”
      </h2>

      {sources.length ? (
        <div className="mt-5 space-y-3">
          {sources.map((source) => (
            <article
              key={`${source.sourceType}-${source.sourceId}`}
              className="rounded-xl border border-border bg-muted/45 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-primary/60" />
                  <h3 className="truncate text-sm font-medium text-foreground">
                    {source.title}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground/80">
                  {Math.round(source.score * 100)}%
                </span>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                {source.content}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground/80">
          No encontramos coincidencias textuales dentro del proyecto seleccionado.
        </p>
      )}
    </section>
  );
}
