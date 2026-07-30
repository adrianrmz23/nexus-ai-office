import Link from "next/link";
import { Archive, FileCode2, GitBranch, RotateCcw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { setRepositoryStatus } from "@/modules/repositories/application/repository-actions";
import {
  REPOSITORY_STATUS_LABELS,
  type RepositoryRecord,
} from "@/modules/repositories/domain/repository";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1_048_576).toFixed(1)} MB`;
}

export function RepositoryCard({
  repository,
  canManage,
}: {
  repository: RepositoryRecord;
  canManage: boolean;
}) {
  return (
    <article className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04] text-primary/75">
          <GitBranch className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-foreground">{repository.name}</h2>
            <span className="rounded-full border border-border px-2 py-1 text-[0.6rem] text-muted-foreground">
              {REPOSITORY_STATUS_LABELS[repository.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground/80">{repository.project?.name ?? "Proyecto"}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-muted/35 p-3">
          <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/60">Archivos</div>
          <div className="mt-2 text-lg font-semibold text-foreground">{repository.file_count}</div>
        </div>
        <div className="rounded-xl border border-border bg-muted/35 p-3">
          <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/60">Indexados</div>
          <div className="mt-2 text-lg font-semibold text-foreground">{repository.indexed_file_count}</div>
        </div>
        <div className="rounded-xl border border-border bg-muted/35 p-3">
          <div className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/60">Tamaño</div>
          <div className="mt-2 text-sm font-semibold text-foreground">{formatBytes(repository.total_bytes)}</div>
        </div>
      </div>

      {repository.error_message ? (
        <p className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-3 text-xs leading-5 text-rose-700 dark:text-rose-200/75">
          {repository.error_message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Link href={`/app/repositorios/${repository.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <FileCode2 /> Explorar
        </Link>
        {canManage && repository.status === "archived" ? (
          <form action={setRepositoryStatus}>
            <input type="hidden" name="repositoryId" value={repository.id} />
            <input type="hidden" name="status" value="active" />
            <FormSubmitButton type="submit" variant="outline" size="sm" pendingLabel="Restaurando...">
              <RotateCcw /> Restaurar
            </FormSubmitButton>
          </form>
        ) : null}
        {canManage && repository.status !== "archived" ? (
          <form action={setRepositoryStatus}>
            <input type="hidden" name="repositoryId" value={repository.id} />
            <input type="hidden" name="status" value="archived" />
            <ConfirmSubmitButton
              type="submit"
              variant="ghost"
              size="sm"
              confirmationMessage={`¿Archivar ${repository.name}? Los archivos y versiones se conservarán.`}
            >
              <Archive /> Archivar
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}
