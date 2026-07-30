"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";

import type { ModelTaskType } from "@/modules/models/domain/model";

export function RecommendationTracker({
  payload,
}: {
  payload: {
    projectId: string | null;
    taskType: ModelTaskType;
    recommendedModelId: string;
    selectedModelId: string;
    economyModelId: string | null;
    qualityModelId: string | null;
    score: number;
    confidence: number;
    reasons: string[];
    requestContext: Record<string, unknown>;
  };
}) {
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo registrar");
        setStatus("saved");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [payload]);

  return (
    <div className="mt-4 flex items-center gap-2 text-[0.65rem] text-muted-foreground/80">
      {status === "saving" ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
      {status === "saved" ? <CheckCircle2 className="size-3.5 text-primary/70" /> : null}
      {status === "error" ? <TriangleAlert className="size-3.5 text-amber-300/70" /> : null}
      {status === "saving"
        ? "Registrando recomendación..."
        : status === "saved"
          ? "Recomendación registrada para analítica."
          : "La recomendación se calculó, pero no pudo registrarse."}
    </div>
  );
}
