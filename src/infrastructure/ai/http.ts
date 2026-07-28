export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export async function requestJson(url: string, init: RequestInit, timeoutMs = 15000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = text; }
    }
    if (!response.ok) {
      const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : null;
      const nested = record && typeof record.error === "object" && record.error !== null
        ? record.error as Record<string, unknown>
        : null;
      const message =
        (nested && typeof nested.message === "string" && nested.message) ||
        (record && typeof record.message === "string" && record.message) ||
        `El proveedor respondió con HTTP ${response.status}.`;
      const code =
        (nested && typeof nested.code === "string" && nested.code) ||
        (record && typeof record.code === "string" && record.code) || null;
      throw new ProviderRequestError(message, response.status, code);
    }
    return body;
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRequestError("La conexión excedió el tiempo de espera.", null, "timeout");
    }
    throw new ProviderRequestError(
      error instanceof Error ? error.message : "No fue posible contactar al proveedor.",
      null,
      "network_error",
    );
  } finally {
    clearTimeout(timeout);
  }
}
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
export function numberOrNull(value: unknown): number | null {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
}
