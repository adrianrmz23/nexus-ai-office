type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY = /(authorization|api[-_]?key|token|secret|password|credential|ciphertext|auth[-_]?tag)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth-limit]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item, depth + 1),
    ]),
  );
}

function write(level: LogLevel, event: string, metadata?: Record<string, unknown>) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata: redact(metadata) } : {}),
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  info(event: string, metadata?: Record<string, unknown>) {
    write("info", event, metadata);
  },
  warn(event: string, metadata?: Record<string, unknown>) {
    write("warn", event, metadata);
  },
  error(event: string, metadata?: Record<string, unknown>) {
    write("error", event, metadata);
  },
};
