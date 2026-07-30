import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2, FileWarning, GitBranch, Search } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RepositoryRefreshForm } from "@/components/repositories/repository-refresh-form";
import { refreshRepositoryZip } from "@/modules/repositories/application/repository-actions";
import { loadRepositoryById, repositorySummaryValue } from "@/modules/repositories/application/repository-queries";
import { repositoryIdSchema } from "@/modules/repositories/domain/repository-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Explorador de repositorio" };

type Props = {
  params: Promise<{ repositoryId: string }>;
  searchParams: Promise<{ q?: string; language?: string; deleted?: string; error?: string; success?: string }>;
};

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1_048_576).toFixed(1)} MB`;
}

export default async function RepositoryDetailPage({ params, searchParams }: Props) {
  const { repositoryId } = await params;
  const query = await searchParams;
  const parsed = repositoryIdSchema.safeParse(repositoryId);
  if (!parsed.success) notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const result = await loadRepositoryById(supabase, membership.workspaceId, parsed.data);
  if (!result) return notFound();
  const { repository } = result;
  const canManage = membership.role === "owner" || membership.role === "admin";
  const languages = [...new Set(result.files.map((file) => file.language).filter(Boolean))].sort() as string[];
  const needle = query.q?.trim().toLowerCase() ?? "";
  const files = result.files.filter((file) => {
    if (query.deleted !== "1" && file.status !== "active") return false;
    if (query.language && file.language !== query.language) return false;
    if (needle && !file.path.toLowerCase().includes(needle) && !file.content_text?.toLowerCase().includes(needle)) return false;
    return true;
  });
  const summary = repository.import_summary;

  return (
    <div className="mx-auto max-w-[100rem] pb-20 lg:pb-0">
      <Link href="/app/repositorios" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft /> Volver a repositorios</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><div className="nexus-kicker">{repository.project?.name}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">{repository.name}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Inventario de la rama {repository.default_branch}. Los agentes solo reciben archivos que selecciones o que consulten mediante herramientas registradas.</p></div>
        <div className="flex flex-wrap gap-2"><Link href={`/app/proyectos/${repository.project_id}`} className={buttonVariants({ variant: "outline" })}><GitBranch /> Abrir proyecto</Link>{repository.repository_url ? <a href={repository.repository_url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary" })}>Referencia GitHub</a> : null}</div>
      </div>

      {query.error ? <div className="mt-6 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-4 text-sm text-rose-700 dark:text-rose-200/75">{query.error}</div> : null}
      {query.success ? <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-sm text-emerald-700 dark:text-emerald-200/75">{query.success}</div> : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[{ label: "Activos", value: result.files.filter((file) => file.status === "active").length }, { label: "Nuevos", value: repositorySummaryValue(summary, "imported") }, { label: "Modificados", value: repositorySummaryValue(summary, "updated") }, { label: "Retirados", value: repositorySummaryValue(summary, "deleted") }, { label: "Omitidos", value: repositorySummaryValue(summary, "skipped") }].map((item) => <article key={item.label} className="nexus-panel rounded-2xl p-5"><div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground/60">{item.label}</div><div className="mt-3 text-2xl font-semibold text-foreground">{item.value}</div></article>)}
      </section>

      {canManage && repository.status !== "archived" ? (
        <RepositoryRefreshForm
          action={refreshRepositoryZip}
          workspaceId={membership.workspaceId}
          projectId={repository.project_id}
          repositoryId={repository.id}
        />
      ) : null}

      <form className="nexus-panel mt-5 grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_16rem_auto_auto]">
        <div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground/80" /><Input name="q" defaultValue={query.q} placeholder="Buscar por ruta o contenido..." className="pl-10" /></div>
        <select name="language" defaultValue={query.language ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm"><option value="">Todos los lenguajes</option>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 text-xs text-muted-foreground"><input type="checkbox" name="deleted" value="1" defaultChecked={query.deleted === "1"} />Retirados</label>
        <button className={buttonVariants({ variant: "secondary" })}>Aplicar</button>
      </form>

      <section className="nexus-panel mt-5 overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="nexus-kicker">Explorador</div><h2 className="mt-1 text-base font-semibold text-foreground">{files.length} archivos visibles</h2></div><FileCode2 className="size-5 text-primary/65" /></header>
        <div className="divide-y divide-border">
          {files.map((file) => (
            <Link key={file.id} href={`/app/repositorios/${repository.id}/archivos/${file.id}`} className="nexus-focus grid gap-2 px-5 py-4 hover:bg-muted/35 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_5rem] sm:items-center">
              <div className="min-w-0"><div className="truncate font-mono text-xs font-medium text-foreground">{file.path}</div><div className="mt-1 text-[0.62rem] text-muted-foreground/70">v{file.current_version_number} · {file.status}</div></div><div className="text-xs text-muted-foreground">{file.language ?? "Texto"}</div><div className="text-xs text-muted-foreground">{formatBytes(file.size_bytes)}</div><div className="text-right text-xs text-primary/70">Abrir</div>
            </Link>
          ))}
          {!files.length ? <div className="grid min-h-48 place-items-center p-8 text-center"><div><FileWarning className="mx-auto size-7 text-muted-foreground/50" /><p className="mt-3 text-sm text-muted-foreground">No hay archivos para estos filtros.</p></div></div> : null}
        </div>
      </section>

      {Array.isArray((summary as Record<string, unknown>).skippedReasons) && ((summary as Record<string, unknown>).skippedReasons as unknown[]).length ? (
        <details className="nexus-panel mt-5 rounded-2xl p-5"><summary className="cursor-pointer text-sm font-medium text-foreground">Archivos omitidos durante la última importación</summary><div className="mt-4 max-h-72 space-y-2 overflow-auto">{((summary as Record<string, unknown>).skippedReasons as Array<{ path?: string; reason?: string }>).map((item, index) => <div key={`${item.path}-${index}`} className="rounded-lg border border-border bg-muted/35 p-3 text-xs"><div className="font-mono text-foreground">{item.path}</div><div className="mt-1 text-muted-foreground">{item.reason}</div></div>)}</div></details>
      ) : null}
    </div>
  );
}
