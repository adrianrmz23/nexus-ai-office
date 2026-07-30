import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
};

type ConsumeRateLimitInput = {
  supabase: SupabaseClient;
  workspaceId: string;
  actionKey: string;
  limit: number;
  windowSeconds: number;
};

function rowOf(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "object" && first !== null
      ? (first as Record<string, unknown>)
      : null;
  }
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export async function consumeRateLimit(
  input: ConsumeRateLimitInput,
): Promise<RateLimitResult> {
  const { data, error } = await input.supabase.rpc("consume_rate_limit", {
    p_workspace_id: input.workspaceId,
    p_action_key: input.actionKey,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error) {
    throw new Error(`No pudimos validar el límite operativo: ${error.message}`);
  }

  const row = rowOf(data);
  if (!row) {
    throw new Error("El control de frecuencia no devolvió un resultado válido.");
  }

  const resetAt = String(row.reset_at ?? new Date().toISOString());
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000),
  );

  return {
    allowed: Boolean(row.allowed),
    remaining: Math.max(0, Number(row.remaining ?? 0)),
    resetAt,
    retryAfterSeconds,
  };
}

export async function recordSecurityEvent(input: {
  supabase: SupabaseClient;
  workspaceId: string;
  eventType: string;
  severity?: "info" | "warning" | "high" | "critical";
  source?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await input.supabase.rpc("record_security_event", {
    p_workspace_id: input.workspaceId,
    p_event_type: input.eventType,
    p_severity: input.severity ?? "info",
    p_source: input.source ?? "application",
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "security_event_write_failed",
        message: error.message,
      }),
    );
  }
}
