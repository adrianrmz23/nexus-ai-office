import { Archive, BrainCircuit, CirclePause, RotateCcw } from "lucide-react";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { setMemoryStatus } from "@/modules/memory/application/memory-actions";
import {
  MEMORY_SCOPE_LABELS,
  MEMORY_STATUS_LABELS,
  MEMORY_TYPE_LABELS,
  type MemoryRecord,
} from "@/modules/memory/domain/memory";

export function MemoryCard({ memory }: { memory: MemoryRecord }) {
  return (
    <article className="nexus-panel rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-400/10 bg-violet-400/[0.04] text-violet-300">
          <BrainCircuit className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{memory.title}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] text-muted-foreground">
              {MEMORY_STATUS_LABELS[memory.status]}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground/80">
            {MEMORY_TYPE_LABELS[memory.memory_type]} · {MEMORY_SCOPE_LABELS[memory.scope_type]} · Importancia {memory.importance}
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {memory.content}
      </p>
      <div className="mt-3 text-xs text-muted-foreground/60">
        {memory.project?.name ?? "Disponible para toda la oficina"}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {memory.status === "archived" ? (
          <form action={setMemoryStatus}>
            <input type="hidden" name="memoryId" value={memory.id} />
            <input type="hidden" name="status" value="active" />
            <FormSubmitButton variant="outline" size="sm" pendingLabel="Restaurando...">
              <RotateCcw /> Restaurar
            </FormSubmitButton>
          </form>
        ) : (
          <>
            <form action={setMemoryStatus}>
              <input type="hidden" name="memoryId" value={memory.id} />
              <input type="hidden" name="status" value={memory.status === "active" ? "inactive" : "active"} />
              <FormSubmitButton variant="outline" size="sm" pendingLabel="Actualizando...">
                {memory.status === "active" ? <CirclePause /> : <RotateCcw />}
                {memory.status === "active" ? "Desactivar" : "Activar"}
              </FormSubmitButton>
            </form>
            <form action={setMemoryStatus}>
              <input type="hidden" name="memoryId" value={memory.id} />
              <input type="hidden" name="status" value="archived" />
              <ConfirmSubmitButton
                type="submit"
                variant="ghost"
                size="sm"
                confirmationMessage={`¿Archivar ${memory.title}? Dejará de recuperarse en las conversaciones.`}
              >
                <Archive /> Archivar
              </ConfirmSubmitButton>
            </form>
          </>
        )}
      </div>
    </article>
  );
}
