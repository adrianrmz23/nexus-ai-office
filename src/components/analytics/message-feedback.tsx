"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  CircleSlash2,
  LoaderCircle,
  MessageSquareMore,
  Save,
  Star,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveMessageFeedback } from "@/modules/analytics/application/analytics-actions";
import {
  FEEDBACK_VERDICT_LABELS,
  type FeedbackVerdict,
  type MessageFeedbackRecord,
} from "@/modules/analytics/domain/analytics";
import { cn } from "@/lib/utils";

const verdictOptions: Array<{
  value: FeedbackVerdict;
  label: string;
  icon: typeof ThumbsUp;
}> = [
  { value: "accepted", label: "Útil", icon: ThumbsUp },
  { value: "partial", label: "Parcial", icon: MessageSquareMore },
  { value: "rejected", label: "No útil", icon: CircleSlash2 },
];

export function MessageFeedback({
  messageId,
  initialFeedback,
}: {
  messageId: string;
  initialFeedback: MessageFeedbackRecord | null;
}) {
  const [feedback, setFeedback] = useState<MessageFeedbackRecord | null>(initialFeedback);
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<FeedbackVerdict>(
    initialFeedback?.verdict ?? "accepted",
  );
  const [rating, setRating] = useState(initialFeedback?.rating ?? 5);
  const [correctionCount, setCorrectionCount] = useState(
    initialFeedback?.correctionCount ?? 0,
  );
  const [estimatedMinutesSaved, setEstimatedMinutesSaved] = useState<string>(
    initialFeedback?.estimatedMinutesSaved?.toString() ?? "",
  );
  const [notes, setNotes] = useState(initialFeedback?.notes ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveMessageFeedback({
        messageId,
        verdict,
        rating,
        correctionCount,
        notes,
        estimatedMinutesSaved:
          estimatedMinutesSaved.trim() === ""
            ? null
            : Number(estimatedMinutesSaved),
      });
      setStatus(result.message);
      if (result.ok) {
        setFeedback(result.feedback);
        setOpen(false);
      }
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {verdictOptions.map((option) => {
          const active = open ? verdict === option.value : feedback?.verdict === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setVerdict(option.value);
                setOpen(true);
              }}
              className={cn(
                "nexus-focus inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[0.65rem] font-medium transition-colors",
                active
                  ? "border-primary/20 bg-primary/[0.06] text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-secondary-foreground",
              )}
              aria-pressed={active}
            >
              <option.icon className="size-3.5" />
              {option.label}
            </button>
          );
        })}
        {feedback && (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="nexus-focus ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.62rem] text-muted-foreground/80 hover:text-secondary-foreground"
          >
            <CheckCircle2 className="size-3.5 text-primary/70" />
            {FEEDBACK_VERDICT_LABELS[feedback.verdict]} · {feedback.rating}/5
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-border bg-muted/50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-secondary-foreground">Evalúa este resultado</div>
              <div className="mt-1 text-[0.62rem] text-muted-foreground/80">
                La calificación alimenta el historial del modelo y del agente.
              </div>
            </div>
            <div className="flex items-center gap-1" aria-label={`Calificación ${rating} de 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="nexus-focus rounded p-0.5"
                  aria-label={`${value} estrellas`}
                >
                  <Star
                    className={cn(
                      "size-4",
                      value <= rating
                        ? "fill-amber-300/80 text-amber-300"
                        : "text-muted-foreground/60",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-[0.65rem] text-muted-foreground">
              Correcciones posteriores
              <input
                type="number"
                min={0}
                max={99}
                value={correctionCount}
                onChange={(event) => setCorrectionCount(Number(event.target.value))}
                className="nexus-focus h-9 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground"
              />
            </label>
            <label className="space-y-1.5 text-[0.65rem] text-muted-foreground">
              Minutos ahorrados (opcional)
              <input
                type="number"
                min={0}
                max={1440}
                value={estimatedMinutesSaved}
                onChange={(event) => setEstimatedMinutesSaved(event.target.value)}
                className="nexus-focus h-9 w-full rounded-lg border border-input bg-card px-3 text-xs text-foreground"
              />
            </label>
          </div>

          <label className="mt-3 block space-y-1.5 text-[0.65rem] text-muted-foreground">
            Nota opcional
            <textarea
              rows={3}
              maxLength={4000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Qué funcionó, qué faltó o por qué requirió correcciones..."
              className="nexus-focus w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-xs leading-5 text-foreground"
            />
          </label>

          {status && <p className="mt-3 text-[0.65rem] text-muted-foreground">{status}</p>}

          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={isPending}>
              {isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Guardar evaluación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
