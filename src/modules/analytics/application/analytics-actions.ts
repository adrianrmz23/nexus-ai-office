"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  analyticsSettingsSchema,
  budgetFormSchema,
  feedbackFormSchema,
} from "@/modules/analytics/domain/analytics-schema";
import type { MessageFeedbackRecord } from "@/modules/analytics/domain/analytics";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Revisa los datos capturados.";
}

function redirectAnalytics(type: "success" | "error", message: string): never {
  redirect(`/app/analitica?${type}=${encodeURIComponent(message)}`);
}

export async function saveMessageFeedback(input: {
  messageId: string;
  verdict: string;
  rating: number;
  correctionCount: number;
  notes: string;
  estimatedMinutesSaved: number | null;
}): Promise<
  | { ok: true; message: string; feedback: MessageFeedbackRecord }
  | { ok: false; message: string }
> {
  const parsed = feedbackFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };

  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { data, error } = await supabase
    .from("user_feedback")
    .upsert(
      {
        workspace_id: membership.workspaceId,
        message_id: parsed.data.messageId,
        verdict: parsed.data.verdict,
        rating: parsed.data.rating,
        correction_count: parsed.data.correctionCount,
        notes: parsed.data.notes,
        estimated_minutes_saved: parsed.data.estimatedMinutesSaved,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "workspace_id,message_id,created_by" },
    )
    .select(
      "id, verdict, rating, correction_count, notes, estimated_minutes_saved, conversation_id",
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "No pudimos guardar tu evaluación.",
    };
  }

  revalidatePath(`/app/conversaciones/${data.conversation_id}`);
  revalidatePath("/app/analitica");
  revalidatePath("/app");

  return {
    ok: true,
    message: "La evaluación fue guardada y alimentará futuras recomendaciones.",
    feedback: {
      id: data.id,
      verdict: data.verdict,
      rating: Number(data.rating),
      correctionCount: Number(data.correction_count),
      notes: data.notes ?? "",
      estimatedMinutesSaved:
        data.estimated_minutes_saved === null
          ? null
          : Number(data.estimated_minutes_saved),
    },
  };
}

export async function saveAnalyticsSettings(formData: FormData) {
  const parsed = analyticsSettingsSchema.safeParse({
    displayCurrency: textValue(formData, "displayCurrency"),
    usdToDisplayRate: textValue(formData, "usdToDisplayRate"),
    acceptedMinutesSaved: textValue(formData, "acceptedMinutesSaved"),
    partialMinutesSaved: textValue(formData, "partialMinutesSaved"),
    rejectedMinutesSaved: textValue(formData, "rejectedMinutesSaved"),
  });
  if (!parsed.success) redirectAnalytics("error", firstIssue(parsed.error));

  const { supabase, user, membership } = await requireCurrentWorkspace();
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirectAnalytics("error", "Solo un owner o administrador puede cambiar la configuración analítica.");
  }

  const { error } = await supabase.from("analytics_settings").upsert(
    {
      workspace_id: membership.workspaceId,
      display_currency: parsed.data.displayCurrency,
      usd_to_display_rate: parsed.data.usdToDisplayRate,
      accepted_minutes_saved: parsed.data.acceptedMinutesSaved,
      partial_minutes_saved: parsed.data.partialMinutesSaved,
      rejected_minutes_saved: parsed.data.rejectedMinutesSaved,
      created_by: user.id,
      updated_by: user.id,
    },
    { onConflict: "workspace_id" },
  );
  if (error) redirectAnalytics("error", error.message);

  revalidatePath("/app/analitica");
  revalidatePath("/app");
  redirectAnalytics("success", "La configuración de analítica fue actualizada.");
}

export async function saveUsageBudget(formData: FormData) {
  const parsed = budgetFormSchema.safeParse({
    projectId: textValue(formData, "projectId"),
    limitAmount: textValue(formData, "limitAmount"),
    currency: textValue(formData, "currency"),
    warningThreshold: textValue(formData, "warningThreshold"),
  });
  if (!parsed.success) redirectAnalytics("error", firstIssue(parsed.error));

  const { supabase, user, membership } = await requireCurrentWorkspace();
  if (membership.role !== "owner" && membership.role !== "admin") {
    redirectAnalytics("error", "Solo un owner o administrador puede cambiar presupuestos.");
  }

  let existingQuery = supabase
    .from("usage_budgets")
    .select("id")
    .eq("workspace_id", membership.workspaceId)
    .eq("is_active", true);
  existingQuery = parsed.data.projectId
    ? existingQuery.eq("project_id", parsed.data.projectId)
    : existingQuery.is("project_id", null);
  const existing = await existingQuery.maybeSingle();

  const values = {
    workspace_id: membership.workspaceId,
    project_id: parsed.data.projectId,
    period: "monthly",
    limit_amount: parsed.data.limitAmount,
    currency: parsed.data.currency,
    warning_threshold: parsed.data.warningThreshold,
    is_active: true,
    created_by: user.id,
    updated_by: user.id,
  };

  const result = existing.data
    ? await supabase
        .from("usage_budgets")
        .update(values)
        .eq("id", existing.data.id)
        .eq("workspace_id", membership.workspaceId)
    : await supabase.from("usage_budgets").insert(values);

  if (result.error) redirectAnalytics("error", result.error.message);
  revalidatePath("/app/analitica");
  revalidatePath("/app");
  redirectAnalytics("success", "El presupuesto mensual fue guardado.");
}

export async function disableUsageBudget(formData: FormData) {
  const budgetId = textValue(formData, "budgetId");
  if (!budgetId) redirectAnalytics("error", "El presupuesto no es válido.");
  const { supabase, user, membership } = await requireCurrentWorkspace();
  const { error } = await supabase
    .from("usage_budgets")
    .update({ is_active: false, updated_by: user.id })
    .eq("id", budgetId)
    .eq("workspace_id", membership.workspaceId);
  if (error) redirectAnalytics("error", error.message);
  revalidatePath("/app/analitica");
  redirectAnalytics("success", "El presupuesto fue desactivado.");
}
