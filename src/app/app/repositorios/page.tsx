import type { Metadata } from "next";
import Link from "next/link";
import { Archive, FileCode2, FolderGit2, Plus, Search } from "lucide-react";

import { RepositoryCard } from "@/components/repositories/repository-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadRepositories,
  loadRepositoryProjects,
} from "@/modules/repositories/application/repository-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Repositorios" };

type Props = {
  searchParams: Promise<{
    project?: string;
    q?: string;
    archived?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function RepositoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const [repositories, projects] = await Promise.all([
    loadRepositories(supabase, membership.workspaceId, {
      projectId: params.project,
      query: params.q,
      includeArchived: params.archived === "1",
    }),
    loadRepositoryProjects(supabase, membership.workspaceId),
  ]);
  const canManage = membership.role === "owner" || membership.role === "admin";
  const active = repositories.filter((repository) => repository.status === "active");
  const totalFiles = active.reduce((sum, repository) => sum + repository.file_count, 0);
  const indexedFiles = active.reduce((sum, repository) => sum + repository.indexed_file_count, 0);

  return (
    <div className="mx-auto max-w-[100rem] pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="nexus-kicker">Código verificable</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">Repositorios del workspace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Importa una copia ZIP segura, explora archivos reales y aprueba cambios antes de crear nuevas versiones.
          </p>
        </div>
        {canManage ? (
          <Link href="/app/repositorios/nuevo" className={buttonVariants({ size: "lg" })}>
            <Plus /> Importar repositorio
          </Link>
        ) : null}
      </div>

      {params.error ? (
        <div className="mt-6 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-4 text-sm text-rose-700 dark:text-rose-200/75">{params.error}</div>
      ) : null}
      {params.success ? (
        <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-sm text-emerald-700 dark:text-emerald-200/75">{params.success}</div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <article className="nexus-panel rounded-2xl p-5"><FolderGit2 className="size-4 text-primary/70" /><div className="mt-4 text-2xl font-semibold text-foreground">{active.length}</div><div className="mt-1 text-xs text-muted-foreground/80">Repositorios activos</div></article>
        <article className="nexus-panel rounded-2xl p-5"><FileCode2 className="size-4 text-cyan-600 dark:text-cyan-300/70" /><div className="mt-4 text-2xl font-semibold text-foreground">{totalFiles}</div><div className="mt-1 text-xs text-muted-foreground/80">Archivos registrados</div></article>
        <article className="nexus-panel rounded-2xl p-5"><Search className="size-4 text-violet-600 dark:text-violet-300/70" /><div className="mt-4 text-2xl font-semibold text-foreground">{indexedFiles}</div><div className="mt-1 text-xs text-muted-foreground/80">Disponibles para agentes</div></article>
      </section>

      <form className="nexus-panel mt-5 grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_18rem_auto_auto]">
        <div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground/80" /><Input name="q" defaultValue={params.q} placeholder="Buscar repositorio..." className="pl-10" /></div>
        <select name="project" defaultValue={params.project ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"><option value="">Todos los proyectos</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-xs text-muted-foreground"><input type="checkbox" name="archived" value="1" defaultChecked={params.archived === "1"} className="accent-[#55e6c1]" /><Archive className="size-3.5" />Incluir archivados</label>
        <button className={buttonVariants({ variant: "secondary" })}>Aplicar</button>
      </form>

      {repositories.length ? (
        <section className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} canManage={canManage} />)}
        </section>
      ) : (
        <section className="nexus-panel mt-5 grid min-h-80 place-items-center rounded-2xl p-8 text-center">
          <div><FolderGit2 className="mx-auto size-8 text-primary/45" /><h2 className="mt-4 text-lg font-semibold text-foreground">No hay repositorios para estos filtros</h2><p className="mt-2 text-sm text-muted-foreground/80">Importa un ZIP del código fuente para crear el primer inventario verificable.</p></div>
        </section>
      )}
    </div>
  );
}
