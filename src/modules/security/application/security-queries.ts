import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";
import type {
  ProductionReadiness,
  SecurityCheck,
  SecurityEventRecord,
} from "@/modules/security/domain/security";

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function numberValue(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function validEncryptionKey(): boolean {
  const value = process.env.NEXUS_CREDENTIAL_ENCRYPTION_KEY;
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

function createCheck(
  input: Omit<SecurityCheck, "status"> & { passed: boolean; warning?: boolean },
): SecurityCheck {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    detail: input.detail,
    status: input.passed ? "pass" : input.warning ? "warning" : "fail",
  };
}

export async function loadProductionReadiness(): Promise<ProductionReadiness> {
  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Solo un administrador puede consultar la postura de seguridad.");
  }

  const [{ data: postureData, error: postureError }, eventsResult] = await Promise.all([
    supabase.rpc("get_nexus_security_posture", {
      p_workspace_id: membership.workspaceId,
    }),
    supabase
      .from("security_events")
      .select("id, event_type, severity, source, metadata, created_at")
      .eq("workspace_id", membership.workspaceId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (postureError) {
    throw new Error(`No pudimos ejecutar la revisión de seguridad: ${postureError.message}`);
  }

  const posture = recordOf(postureData);
  const providerSummary = recordOf(posture.providers);
  const rlsDisabled = stringArray(posture.rlsDisabledTables);
  const publicBuckets = stringArray(posture.publicNexusBuckets);
  const exposedSensitive = stringArray(posture.exposedSensitiveTables);
  const recentHighSeverityEvents = numberValue(posture.recentHighSeverityEvents);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const production = process.env.NODE_ENV === "production";
  const appUrlSecure = !production || appUrl.startsWith("https://");
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  const checks: SecurityCheck[] = [
    createCheck({
      id: "rls",
      title: "Row Level Security",
      description: "Todas las tablas públicas deben aplicar aislamiento dentro de PostgreSQL.",
      passed: rlsDisabled.length === 0,
      detail: rlsDisabled.length
        ? `Tablas sin RLS: ${rlsDisabled.join(", ")}`
        : "Todas las tablas públicas tienen RLS habilitado.",
    }),
    createCheck({
      id: "storage",
      title: "Storage privado",
      description: "Los buckets internos de NEXUS no deben ser públicos.",
      passed: publicBuckets.length === 0,
      detail: publicBuckets.length
        ? `Buckets públicos: ${publicBuckets.join(", ")}`
        : "Todos los buckets nexus-* permanecen privados.",
    }),
    createCheck({
      id: "sensitive-grants",
      title: "Tablas sensibles sin exposición",
      description: "Credenciales cifradas y contadores internos no deben exponerse por la Data API.",
      passed: exposedSensitive.length === 0,
      detail: exposedSensitive.length
        ? `Revisa privilegios de: ${exposedSensitive.join(", ")}`
        : "Las tablas sensibles no conceden CRUD directo a usuarios.",
    }),
    createCheck({
      id: "encryption-key",
      title: "Clave maestra de credenciales",
      description: "La clave del servidor debe representar exactamente 32 bytes.",
      passed: validEncryptionKey(),
      detail: validEncryptionKey()
        ? "La clave maestra tiene el formato esperado."
        : "Configura NEXUS_CREDENTIAL_ENCRYPTION_KEY con 32 bytes en Base64.",
    }),
    createCheck({
      id: "supabase-config",
      title: "Configuración pública de Supabase",
      description: "La URL y la clave publicable son necesarias para Auth y RLS.",
      passed: supabaseConfigured,
      detail: supabaseConfigured
        ? "La configuración pública está disponible."
        : "Falta URL o publishable key de Supabase.",
    }),
    createCheck({
      id: "https",
      title: "Origen de producción seguro",
      description: "La aplicación desplegada debe declarar un origen HTTPS.",
      passed: appUrlSecure,
      warning: !production,
      detail: production
        ? appUrlSecure
          ? "NEXT_PUBLIC_APP_URL utiliza HTTPS."
          : "NEXT_PUBLIC_APP_URL debe comenzar con https:// en producción."
        : "En desarrollo se permite localhost; vuelve a validar después del despliegue.",
    }),
    createCheck({
      id: "providers",
      title: "Salud de proveedores",
      description: "Las conexiones activas deben probarse antes de utilizarlas en producción.",
      passed:
        numberValue(providerSummary.configured) === 0 ||
        numberValue(providerSummary.errors) === 0,
      warning: numberValue(providerSummary.configured) === 0,
      detail: `${numberValue(providerSummary.healthy)} saludables, ${numberValue(providerSummary.errors)} con error, ${numberValue(providerSummary.configured)} configurados.`,
    }),
    createCheck({
      id: "security-events",
      title: "Eventos críticos recientes",
      description: "Los eventos high o critical de los últimos 30 días requieren revisión.",
      passed: recentHighSeverityEvents === 0,
      detail:
        recentHighSeverityEvents === 0
          ? "No hay eventos high o critical pendientes."
          : `${recentHighSeverityEvents} eventos de severidad alta o crítica en 30 días.`,
    }),
  ];

  const score = Math.round(
    (checks.reduce((total, check) => {
      if (check.status === "pass") return total + 1;
      if (check.status === "warning") return total + 0.5;
      return total;
    }, 0) /
      checks.length) *
      100,
  );

  const events: SecurityEventRecord[] = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    eventType: event.event_type,
    severity: event.severity as SecurityEventRecord["severity"],
    source: event.source,
    metadata: recordOf(event.metadata),
    createdAt: event.created_at,
  }));

  return {
    score,
    checks,
    events,
    providerSummary: {
      total: numberValue(providerSummary.total),
      configured: numberValue(providerSummary.configured),
      healthy: numberValue(providerSummary.healthy),
      errors: numberValue(providerSummary.errors),
    },
    rateLimitWindows24h: numberValue(posture.rateLimitWindows24h),
    checkedAt: String(posture.checkedAt ?? new Date().toISOString()),
  };
}
