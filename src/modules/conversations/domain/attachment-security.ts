import type { ChatAttachmentInput } from "@/modules/conversations/domain/conversation";

const SENSITIVE_FILE_NAMES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json",
] as const;

const SECRET_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    reason: "contiene una clave privada",
  },
  {
    pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{20,}/i,
    reason: "parece contener una credencial",
  },
  {
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
    reason: "parece contener una clave de API",
  },
  {
    pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/,
    reason: "parece contener un token de GitHub",
  },
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    reason: "parece contener una clave de acceso de AWS",
  },
];

function normalizedBaseName(fileName: string): string {
  const normalized = fileName.trim().replaceAll("\\", "/").toLowerCase();
  return normalized.split("/").pop() ?? normalized;
}

export function detectSensitiveAttachment(
  attachment: Pick<ChatAttachmentInput, "fileName" | "content">,
): string | null {
  const baseName = normalizedBaseName(attachment.fileName);
  if (
    SENSITIVE_FILE_NAMES.some((name) => baseName === name)
  ) {
    return "el nombre corresponde a un archivo de credenciales o secretos";
  }

  for (const candidate of SECRET_PATTERNS) {
    candidate.pattern.lastIndex = 0;
    if (candidate.pattern.test(attachment.content)) return candidate.reason;
  }

  return null;
}
