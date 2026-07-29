import { Archive, FileCode2, FileText, RotateCcw } from "lucide-react";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { setDocumentStatus } from "@/modules/memory/application/memory-actions";
import {
  DOCUMENT_STATUS_LABELS,
  type MemoryDocumentRecord,
} from "@/modules/memory/domain/memory";

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(value >= 102_400 ? 0 : 1)} KB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function DocumentCard({ document }: { document: MemoryDocumentRecord }) {
  const indexed = document.status === "ready";
  return (
    <article className="nexus-panel rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04] text-primary/80">
          {indexed ? <FileCode2 className="size-5" /> : <FileText className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-100">
              {document.title}
            </h3>
            <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[0.62rem] text-slate-500">
              {DOCUMENT_STATUS_LABELS[document.status]}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            <span>{document.project?.name ?? "Memoria global"}</span>
            <span>{document.file_name ?? "Texto"}</span>
            <span>{formatBytes(document.size_bytes)}</span>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.05] bg-black/10 p-3 text-center">
        <div>
          <dt className="font-mono text-[0.55rem] tracking-wider text-slate-700 uppercase">Fragmentos</dt>
          <dd className="mt-1 text-sm text-slate-300">{document.chunk_count}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.55rem] tracking-wider text-slate-700 uppercase">Embeddings</dt>
          <dd className="mt-1 text-sm text-slate-300">{document.embedding_status}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.55rem] tracking-wider text-slate-700 uppercase">Actualizado</dt>
          <dd className="mt-1 text-xs text-slate-400">{formatDate(document.updated_at)}</dd>
        </div>
      </dl>

      {document.error_message ? (
        <p className="mt-3 rounded-lg border border-amber-400/10 bg-amber-400/[0.03] px-3 py-2 text-xs leading-5 text-amber-200/60">
          {document.error_message}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end border-t border-white/[0.05] pt-4">
        {document.status === "archived" ? (
          <form action={setDocumentStatus}>
            <input type="hidden" name="documentId" value={document.id} />
            <input type="hidden" name="status" value="restore" />
            <FormSubmitButton variant="outline" size="sm" pendingLabel="Restaurando...">
              <RotateCcw /> Restaurar
            </FormSubmitButton>
          </form>
        ) : (
          <form action={setDocumentStatus}>
            <input type="hidden" name="documentId" value={document.id} />
            <input type="hidden" name="status" value="archived" />
            <ConfirmSubmitButton
              type="submit"
              variant="ghost"
              size="sm"
              confirmationMessage={`¿Archivar ${document.title}? Dejará de utilizarse como contexto.`}
            >
              <Archive /> Archivar
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
    </article>
  );
}
