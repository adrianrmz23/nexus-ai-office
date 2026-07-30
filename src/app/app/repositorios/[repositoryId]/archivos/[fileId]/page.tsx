import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  FileCode2,
  GitCompareArrows,
  Save,
  XCircle,
} from "lucide-react";

import { DiffView } from "@/components/artifacts/diff-view";
import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveFileProposal,
  createFileChangeProposal,
  reviewFileChangeProposal,
} from "@/modules/repositories/application/repository-actions";
import { loadProjectFileById } from "@/modules/repositories/application/repository-queries";
import {
  FILE_PROPOSAL_STATUS_LABELS,
  type FileChangeProposalRecord,
} from "@/modules/repositories/domain/repository";
import {
  projectFileIdSchema,
  repositoryIdSchema,
} from "@/modules/repositories/domain/repository-schema";
import { computeLineDiff } from "@/modules/artifacts/domain/line-diff";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Archivo del repositorio" };

type Props = {
  params: Promise<{ repositoryId: string; fileId: string }>;
  searchParams: Promise<{
    proposal?: string;
    from?: string;
    to?: string;
    error?: string;
    success?: string;
  }>;
};

function selectedProposal(
  proposals: FileChangeProposalRecord[],
  proposalId?: string,
): FileChangeProposalRecord | null {
  if (proposalId) {
    return proposals.find((proposal) => proposal.id === proposalId) ?? null;
  }
  return proposals.find((proposal) => proposal.status === "proposed" || proposal.status === "changes_requested") ?? proposals[0] ?? null;
}

export default async function RepositoryFilePage({ params, searchParams }: Props) {
  const route = await params;
  const query = await searchParams;
  const repositoryResult = repositoryIdSchema.safeParse(route.repositoryId);
  const fileResult = projectFileIdSchema.safeParse(route.fileId);
  if (!repositoryResult.success || !fileResult.success) notFound();

  const { supabase, membership } = await requireCurrentWorkspace();
  const result = await loadProjectFileById(
    supabase,
    membership.workspaceId,
    repositoryResult.data,
    fileResult.data,
  );
  if (!result) return notFound();

  const { repository, file, versions, proposals } = result;
  const canApprove = membership.role === "owner" || membership.role === "admin";
  const proposal = selectedProposal(proposals, query.proposal);
  const fromNumber = Number(query.from || Math.max(1, file.current_version_number - 1));
  const toNumber = Number(query.to || file.current_version_number);
  const fromVersion = versions.find((version) => version.version_number === fromNumber) ?? versions.at(-1) ?? null;
  const toVersion = versions.find((version) => version.version_number === toNumber) ?? versions[0] ?? null;
  const versionDiff = computeLineDiff(fromVersion?.content_text ?? "", toVersion?.content_text ?? "");
  const proposalDiff = proposal
    ? computeLineDiff(file.content_text ?? "", proposal.proposed_content)
    : [];

  return (
    <div className="mx-auto max-w-[100rem] pb-20 lg:pb-0">
      <Link
        href={`/app/repositorios/${repository.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft /> Volver al repositorio
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="nexus-kicker">{repository.name}</div>
          <h1 className="mt-3 break-all font-mono text-2xl font-semibold text-foreground">
            {file.path}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border px-2.5 py-1">v{file.current_version_number}</span>
            <span className="rounded-full border border-border px-2.5 py-1">{file.language ?? "Texto"}</span>
            <span className="rounded-full border border-border px-2.5 py-1">{file.status}</span>
          </div>
        </div>
        <Link href={`/app/proyectos/${file.project_id}`} className={buttonVariants({ variant: "outline" })}>
          <FileCode2 /> Abrir proyecto
        </Link>
      </div>

      <div className="mt-6">
        <FormMessage error={query.error} success={query.success} />
      </div>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="nexus-kicker">Versión actual</div>
          <div className="nexus-scrollbar mt-4 max-h-[52rem] overflow-auto rounded-xl border border-border bg-muted/50 p-4">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-secondary-foreground">
              {file.content_text ?? "Sin contenido indexado"}
            </pre>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="nexus-panel rounded-2xl p-5">
            <div className="nexus-kicker">Historial</div>
            <div className="mt-4 space-y-2">
              {versions.map((version) => (
                <div key={version.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">Versión {version.version_number}</span>
                    <span className="text-[0.58rem] text-muted-foreground/70">{version.source_type}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground/80">
                    {version.change_summary || "Sin resumen"}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="nexus-panel rounded-2xl p-5">
            <div className="nexus-kicker">Propuestas</div>
            <div className="mt-4 space-y-2">
              {proposals.map((item) => (
                <Link
                  key={item.id}
                  href={`?proposal=${item.id}`}
                  className="block rounded-xl border border-border p-3 hover:border-primary/20"
                >
                  <div className="text-sm font-medium text-foreground">{item.title}</div>
                  <div className="mt-1 text-[0.62rem] text-muted-foreground/80">
                    {FILE_PROPOSAL_STATUS_LABELS[item.status]} · base v{item.base_version_number}
                  </div>
                </Link>
              ))}
              {!proposals.length ? <p className="text-xs text-muted-foreground/70">Todavía no hay propuestas.</p> : null}
            </div>
          </article>
        </aside>
      </section>

      {versions.length > 1 ? (
        <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-primary/70" /><div className="nexus-kicker">Versiones</div></div>
              <h2 className="mt-2 text-base font-semibold text-foreground">Comparar historial</h2>
            </div>
            <form className="flex flex-wrap items-end gap-2">
              <div><Label htmlFor="from">Desde</Label><select id="from" name="from" defaultValue={fromVersion?.version_number} className="mt-2 h-10 rounded-lg border border-input bg-card px-3 text-sm">{versions.map((version) => <option key={version.id} value={version.version_number}>v{version.version_number}</option>)}</select></div>
              <div><Label htmlFor="to">Hasta</Label><select id="to" name="to" defaultValue={toVersion?.version_number} className="mt-2 h-10 rounded-lg border border-input bg-card px-3 text-sm">{versions.map((version) => <option key={version.id} value={version.version_number}>v{version.version_number}</option>)}</select></div>
              <button className={buttonVariants({ variant: "secondary" })}>Comparar</button>
            </form>
          </div>
          <div className="mt-5"><DiffView lines={versionDiff} /></div>
        </section>
      ) : null}

      {proposal ? (
        <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="nexus-kicker">Revisión humana</div>
              <h2 className="mt-2 text-lg font-semibold text-foreground">{proposal.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{proposal.summary || "Sin resumen adicional."}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{FILE_PROPOSAL_STATUS_LABELS[proposal.status]}</span>
          </div>
          <div className="mt-5"><DiffView lines={proposalDiff} /></div>
          {proposal.status === "proposed" || proposal.status === "changes_requested" ? (
            <form action={reviewFileChangeProposal} className="mt-6 rounded-xl border border-border bg-muted/35 p-4">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <Label htmlFor="reviewNote">Notas de revisión</Label>
              <Textarea id="reviewNote" name="reviewNote" defaultValue={proposal.review_note} className="mt-2 min-h-28" />
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button name="status" value="changes_requested" className={buttonVariants({ variant: "outline" })}>Solicitar cambios</button>
                <button name="status" value="rejected" className={buttonVariants({ variant: "destructive" })}><XCircle /> Rechazar</button>
                {canApprove ? (
                  <button name="status" value="approved" className={buttonVariants()}>
                    <CheckCircle2 /> Aprobar y crear versión
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}
          {proposal.status !== "archived" ? (
            <form action={archiveFileProposal} className="mt-3 flex justify-end">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <ConfirmSubmitButton variant="ghost" confirmationMessage="¿Archivar esta propuesta?">
                <Archive /> Archivar propuesta
              </ConfirmSubmitButton>
            </form>
          ) : null}
        </section>
      ) : null}

      <form action={createFileChangeProposal} className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <input type="hidden" name="fileId" value={file.id} />
        <input type="hidden" name="conversationId" value="" />
        <input type="hidden" name="sourceMessageId" value="" />
        <input type="hidden" name="proposedByAgentId" value="" />
        <div className="nexus-kicker">Nueva propuesta</div>
        <h2 className="mt-2 text-base font-semibold text-foreground">Proponer archivo completo</h2>
        <p className="mt-2 text-sm text-muted-foreground">La versión actual no cambia hasta que apruebes la propuesta.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="title">Título</Label><input id="title" name="title" defaultValue={`Actualizar ${file.file_name}`} className="nexus-focus mt-2 h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm" required /></div>
          <div><Label htmlFor="summary">Resumen</Label><input id="summary" name="summary" placeholder="Qué cambia y por qué" className="nexus-focus mt-2 h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm" /></div>
        </div>
        <div className="mt-4"><Label htmlFor="proposedContent">Contenido completo propuesto</Label><Textarea id="proposedContent" name="proposedContent" defaultValue={file.content_text ?? ""} className="nexus-scrollbar mt-2 min-h-[34rem] font-mono text-xs leading-6" required /></div>
        <div className="mt-5 flex justify-end"><FormSubmitButton pendingLabel="Guardando propuesta..."><Save /> Guardar propuesta</FormSubmitButton></div>
      </form>
    </div>
  );
}
