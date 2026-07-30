import type { Metadata } from "next";
import { BrainCircuit, DatabaseZap, FileSearch, Search } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { DocumentCard } from "@/components/memory/document-card";
import { MemoryCard } from "@/components/memory/memory-card";
import { MemoryForm } from "@/components/memory/memory-form";
import { MemoryUploadForm } from "@/components/memory/memory-upload-form";
import { RetrievalResults } from "@/components/memory/retrieval-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createMemory,
  uploadMemoryDocument,
} from "@/modules/memory/application/memory-actions";
import {
  loadMemories,
  loadMemoryDocuments,
  loadMemoryProjects,
  loadMemoryStats,
  searchMemoryText,
} from "@/modules/memory/application/memory-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Memoria" };

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    project?: string;
    status?: string;
    q?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function MemoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const projectId = params.project?.trim() || "";
  const status = ["all", "active", "inactive", "archived", "ready", "stored_unindexed", "failed"].includes(
    params.status ?? "",
  )
    ? params.status ?? "all"
    : "all";
  const query = params.q?.trim().slice(0, 240) ?? "";

  const [projects, documents, memories, stats, retrievalSources] = await Promise.all([
    loadMemoryProjects(supabase, membership.workspaceId),
    loadMemoryDocuments(supabase, membership.workspaceId, {
      projectId: projectId || undefined,
      status: ["ready", "stored_unindexed", "failed", "archived"].includes(status)
        ? status
        : undefined,
    }),
    loadMemories(supabase, membership.workspaceId, {
      projectId: projectId || undefined,
      status: ["active", "inactive", "archived"].includes(status) ? status : undefined,
      query: query || undefined,
    }),
    loadMemoryStats(supabase, membership.workspaceId),
    searchMemoryText({
      supabase,
      workspaceId: membership.workspaceId,
      projectId: projectId || null,
      query,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="nexus-kicker">Contexto verificable</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Memoria de NEXUS
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Administra documentos, decisiones y preferencias sin mezclar información entre proyectos. Las fuentes recuperadas quedan visibles dentro de cada conversación.
          </p>
        </div>
        <div className="rounded-xl border border-primary/10 bg-primary/[0.035] px-4 py-3 text-xs leading-5 text-primary/65">
          <div className="flex items-center gap-2 font-medium text-primary/80">
            <DatabaseZap className="size-4" /> Recuperación híbrida
          </div>
          <div className="mt-1">Embeddings cuando existe un modelo compatible; búsqueda textual como respaldo.</div>
        </div>
      </div>

      <div className="mt-7">
        <FormMessage error={params.error} success={params.success} />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Documentos", stats.documents, "Archivos conservados"],
          ["Indexados", stats.readyDocuments, "Disponibles para recuperar"],
          ["Memorias activas", stats.activeMemories, "Decisiones y preferencias"],
          ["Recuperaciones", stats.retrievals, "Consultas registradas"],
        ].map(([label, value, detail]) => (
          <article key={String(label)} className="nexus-panel rounded-2xl p-5">
            <div className="font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground/80 uppercase">
              {label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
            <div className="mt-2 text-xs text-muted-foreground/80">{detail}</div>
          </article>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <MemoryUploadForm action={uploadMemoryDocument} projects={projects} />
        <MemoryForm action={createMemory} projects={projects} />
      </section>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="size-4 text-primary/70" />
          <div className="nexus-kicker">Explorar contexto</div>
        </div>
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem_14rem_auto]">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Buscar decisiones, archivos o fragmentos..."
          />
          <select
            name="project"
            defaultValue={projectId}
            className="nexus-focus h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="nexus-focus h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="all">Todos los estados</option>
            <optgroup label="Memorias">
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="archived">Archivadas</option>
            </optgroup>
            <optgroup label="Documentos">
              <option value="ready">Indexados</option>
              <option value="stored_unindexed">Sin indexar</option>
              <option value="failed">Con error</option>
            </optgroup>
          </select>
          <Button type="submit" variant="secondary">
            <FileSearch /> Aplicar filtros
          </Button>
        </form>
        {query && !projectId ? (
          <p className="mt-3 text-xs leading-5 text-amber-200/50">
            Selecciona un proyecto para probar la recuperación de fragmentos. El listado de memorias sí utiliza la búsqueda escrita.
          </p>
        ) : null}
      </section>

      <RetrievalResults query={query} sources={retrievalSources} />

      <section className="mt-6">
        <div className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary/70" />
          <div className="nexus-kicker">Memorias estructuradas</div>
        </div>
        {memories.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        ) : (
          <div className="nexus-panel mt-4 rounded-2xl p-8 text-center text-sm text-muted-foreground/80">
            No hay memorias para los filtros actuales.
          </div>
        )}
      </section>

      <section className="mt-7">
        <div className="flex items-center gap-2">
          <FileSearch className="size-4 text-primary/70" />
          <div className="nexus-kicker">Documentos y fragmentos</div>
        </div>
        {documents.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {documents.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="nexus-panel mt-4 rounded-2xl p-8 text-center text-sm text-muted-foreground/80">
            No hay documentos para los filtros actuales.
          </div>
        )}
      </section>
    </div>
  );
}
