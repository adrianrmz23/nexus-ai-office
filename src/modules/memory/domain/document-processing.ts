import { createHash } from "node:crypto";

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "json", "sql", "ts", "tsx", "js", "jsx", "php",
  "liquid", "css", "scss", "html", "htm", "log", "yaml", "yml", "xml", "csv",
  "toml", "ini", "sh", "ps1", "py", "java", "cs", "go", "rb", "vue",
]);

const BLOCKED_NAMES = new Set([
  ".env", ".env.local", ".env.development", ".env.production", "id_rsa", "id_ed25519",
  "credentials.json", "service-account.json",
]);

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bsk-[a-z0-9_-]{20,}\b/i,
  /\bgh[pousr]_[a-z0-9]{20,}\b/i,
  /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^\s"']{12,}/i,
  /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\b/,
];

export const MAX_DOCUMENT_BYTES = 786_432;
export const MAX_INDEXABLE_BYTES = 524_288;
export const MAX_DOCUMENT_CHUNKS = 60;

export function fileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const dot = normalized.lastIndexOf(".");
  return dot > 0 && dot < normalized.length - 1 ? normalized.slice(dot + 1) : "";
}

export function safeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 180) || "documento";
}

export function isIndexableTextFile(fileName: string, mimeType: string): boolean {
  return mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(fileExtension(fileName));
}

export function detectDocumentRisk(input: {
  fileName: string;
  content?: string;
}): string | null {
  const name = input.fileName.trim().toLowerCase();
  if (BLOCKED_NAMES.has(name) || name.startsWith(".env.")) {
    return "No se permiten archivos de entorno, credenciales ni llaves privadas.";
  }

  if (input.content && SECRET_PATTERNS.some((pattern) => pattern.test(input.content!))) {
    return "El archivo parece contener una credencial, token, contraseña o llave privada.";
  }

  return null;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeTextContent(content: string, extension: string): string {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (extension === "json") {
    try {
      return JSON.stringify(JSON.parse(normalized) as unknown, null, 2);
    } catch {
      return normalized;
    }
  }
  return normalized;
}

export type ProcessedChunk = {
  chunkIndex: number;
  content: string;
  checksum: string;
  tokenEstimate: number;
  metadata: Record<string, unknown>;
};

export function chunkDocument(content: string): ProcessedChunk[] {
  const target = 4_500;
  const overlap = 450;
  const chunks: ProcessedChunk[] = [];
  let cursor = 0;

  while (cursor < content.length && chunks.length < MAX_DOCUMENT_CHUNKS) {
    let end = Math.min(content.length, cursor + target);
    if (end < content.length) {
      const boundary = Math.max(
        content.lastIndexOf("\n\n", end),
        content.lastIndexOf("\n", end),
      );
      if (boundary > cursor + Math.floor(target * 0.55)) end = boundary;
    }

    const value = content.slice(cursor, end).trim();
    if (value) {
      chunks.push({
        chunkIndex: chunks.length,
        content: value,
        checksum: sha256(value),
        tokenEstimate: Math.ceil(value.length / 4),
        metadata: { startCharacter: cursor, endCharacter: end },
      });
    }

    if (end >= content.length) break;
    cursor = Math.max(cursor + 1, end - overlap);
  }

  return chunks;
}
