import type { Metadata } from "next";

import { RepositoryImportForm } from "@/components/repositories/repository-import-form";
import { importRepositoryZip } from "@/modules/repositories/application/repository-actions";
import { loadRepositoryProjects } from "@/modules/repositories/application/repository-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Importar repositorio" };

type Props = { searchParams: Promise<{ project?: string; error?: string }> };

export default async function NewRepositoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  const projects = await loadRepositoryProjects(supabase, membership.workspaceId);

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Nueva fuente de código</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">Importar repositorio</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">El ZIP se carga temporalmente a un espacio privado, se analiza en el servidor y se elimina después de construir el inventario seguro.</p>
      <div className="mt-7">
        {projects.length ? <RepositoryImportForm action={importRepositoryZip} projects={projects} workspaceId={membership.workspaceId} initialProjectId={params.project} error={params.error} /> : <div className="nexus-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">Crea un proyecto antes de importar código.</div>}
      </div>
    </div>
  );
}
