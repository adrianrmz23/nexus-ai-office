import { createHash } from "node:crypto";

import type { NextRequest } from "next/server";

import { manualRecommendationSchema } from "@/modules/analytics/domain/analytics-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "La solicitud no contiene JSON válido." }, { status: 400 });
  }
  const parsed = manualRecommendationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "La recomendación no es válida." },
      { status: 400 },
    );
  }

  const { supabase, user, membership } = await requireCurrentWorkspace();
  const payload = parsed.data;
  const modelIds = [
    payload.recommendedModelId,
    payload.selectedModelId,
    payload.economyModelId,
    payload.qualityModelId,
  ].filter((value): value is string => Boolean(value));
  const { data: models } = await supabase
    .from("ai_models")
    .select("id")
    .eq("workspace_id", membership.workspaceId)
    .in("id", modelIds);
  if ((models ?? []).length !== new Set(modelIds).size) {
    return Response.json({ error: "Uno de los modelos no pertenece a la oficina." }, { status: 403 });
  }

  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        userId: user.id,
        projectId: payload.projectId,
        taskType: payload.taskType,
        recommendedModelId: payload.recommendedModelId,
        selectedModelId: payload.selectedModelId,
        requestContext: payload.requestContext,
      }),
    )
    .digest("hex");

  const { error } = await supabase.from("model_recommendation_events").upsert(
    {
      workspace_id: membership.workspaceId,
      project_id: payload.projectId,
      task_type: payload.taskType,
      source: "manual",
      recommended_model_id: payload.recommendedModelId,
      selected_model_id: payload.selectedModelId,
      alternative_economy_model_id: payload.economyModelId,
      alternative_quality_model_id: payload.qualityModelId,
      recommendation_score: payload.score,
      confidence: payload.confidence,
      reasons: payload.reasons,
      request_context: payload.requestContext,
      request_hash: requestHash,
      was_overridden: payload.selectedModelId !== payload.recommendedModelId,
      created_by: user.id,
    },
    {
      onConflict: "workspace_id,source,request_hash",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
