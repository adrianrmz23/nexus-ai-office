import { inflateRawSync } from "node:zlib";

import {
  detectDocumentRisk,
  fileExtension,
  normalizeTextContent,
  sha256,
} from "@/modules/memory/domain/document-processing";
import {
  MAX_REPOSITORY_ENTRIES,
  MAX_REPOSITORY_FILE_BYTES,
  MAX_REPOSITORY_TEXT_FILES,
  MAX_REPOSITORY_TOTAL_TEXT_BYTES,
  MAX_REPOSITORY_ZIP_BYTES,
} from "@/modules/repositories/domain/repository-limits";

export {
  MAX_REPOSITORY_ENTRIES,
  MAX_REPOSITORY_FILE_BYTES,
  MAX_REPOSITORY_TEXT_FILES,
  MAX_REPOSITORY_TOTAL_TEXT_BYTES,
  MAX_REPOSITORY_ZIP_BYTES,
} from "@/modules/repositories/domain/repository-limits";

const BLOCKED_SEGMENTS = new Set([
  ".git",
  ".next",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  "storage",
]);

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svgz", "pdf",
  "zip", "gz", "tar", "7z", "rar", "woff", "woff2", "ttf", "otf",
  "mp3", "wav", "mp4", "mov", "avi", "webm", "exe", "dll", "so",
  "dylib", "bin", "class", "jar", "wasm", "lockb", "sqlite", "db",
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript React",
  js: "JavaScript",
  jsx: "JavaScript React",
  json: "JSON",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  htm: "HTML",
  liquid: "Liquid",
  php: "PHP",
  sql: "SQL",
  md: "Markdown",
  markdown: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  vue: "Vue",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  java: "Java",
  cs: "C#",
  sh: "Shell",
  ps1: "PowerShell",
  toml: "TOML",
  ini: "INI",
  txt: "Texto",
};

const MIME_BY_EXTENSION: Record<string, string> = {
  ts: "application/typescript",
  tsx: "application/typescript",
  js: "application/javascript",
  jsx: "application/javascript",
  json: "application/json",
  css: "text/css",
  scss: "text/x-scss",
  html: "text/html",
  htm: "text/html",
  liquid: "application/x-liquid",
  php: "application/x-httpd-php",
  sql: "application/sql",
  md: "text/markdown",
  markdown: "text/markdown",
  yaml: "application/yaml",
  yml: "application/yaml",
  xml: "application/xml",
  txt: "text/plain",
};

export type ExtractedRepositoryFile = {
  path: string;
  directoryPath: string;
  fileName: string;
  extension: string | null;
  mimeType: string;
  language: string | null;
  sizeBytes: number;
  checksum: string;
  content: string;
};

export type RepositoryZipResult = {
  files: ExtractedRepositoryFile[];
  skipped: Array<{ path: string; reason: string }>;
  rootPrefix: string | null;
};

type CentralEntry = {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

function assertRange(bytes: Uint8Array, offset: number, length: number): void {
  if (offset < 0 || length < 0 || offset + length > bytes.length) {
    throw new Error("El ZIP contiene offsets fuera de rango.");
  }
}

function uint16(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 2);
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

function uint32(bytes: Uint8Array, offset: number): number {
  assertRange(bytes, offset, 4);
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  if (bytes.length < 22) throw new Error("El archivo no es un ZIP válido.");
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (uint32(bytes, offset) === 0x06054b50) return offset;
  }
  throw new Error("El ZIP no contiene un directorio central válido.");
}

function decodeName(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function sanitizePath(raw: string): string | null {
  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\0/g, "");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "..")) return null;
  return segments.join("/");
}

function readCentralEntries(bytes: Uint8Array): CentralEntry[] {
  const eocd = findEndOfCentralDirectory(bytes);
  const currentDisk = uint16(bytes, eocd + 4);
  const centralDisk = uint16(bytes, eocd + 6);
  const diskEntryCount = uint16(bytes, eocd + 8);
  const entryCount = uint16(bytes, eocd + 10);
  const centralSize = uint32(bytes, eocd + 12);
  const centralOffset = uint32(bytes, eocd + 16);
  if (
    currentDisk !== 0 ||
    centralDisk !== 0 ||
    diskEntryCount !== entryCount ||
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    throw new Error("Los ZIP multidisco o ZIP64 todavía no son compatibles.");
  }
  assertRange(bytes, centralOffset, centralSize);
  if (entryCount > MAX_REPOSITORY_ENTRIES) {
    throw new Error(`El ZIP contiene ${entryCount} entradas y supera el límite de ${MAX_REPOSITORY_ENTRIES}.`);
  }

  const entries: CentralEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    assertRange(bytes, cursor, 46);
    if (uint32(bytes, cursor) !== 0x02014b50) {
      throw new Error("El directorio central del ZIP está dañado.");
    }
    const flags = uint16(bytes, cursor + 8);
    const method = uint16(bytes, cursor + 10);
    const compressedSize = uint32(bytes, cursor + 20);
    const uncompressedSize = uint32(bytes, cursor + 24);
    const nameLength = uint16(bytes, cursor + 28);
    const extraLength = uint16(bytes, cursor + 30);
    const commentLength = uint16(bytes, cursor + 32);
    const localHeaderOffset = uint32(bytes, cursor + 42);
    const recordLength = 46 + nameLength + extraLength + commentLength;
    assertRange(bytes, cursor, recordLength);
    const name = decodeName(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    entries.push({ name, flags, method, compressedSize, uncompressedSize, localHeaderOffset });
    cursor += recordLength;
  }
  return entries;
}

function commonRoot(paths: string[]): string | null {
  if (!paths.length) return null;
  const firstSegments = paths.map((path) => path.split("/")[0]).filter(Boolean);
  const root = firstSegments[0];
  return root && firstSegments.every((segment) => segment === root) ? root : null;
}

function removeRoot(path: string, root: string | null): string {
  if (!root) return path;
  return path === root ? path : path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function blockedPath(path: string): boolean {
  const segments = path.toLowerCase().split("/");
  return segments.some((segment) => BLOCKED_SEGMENTS.has(segment));
}

function decompressEntry(bytes: Uint8Array, entry: CentralEntry): Uint8Array {
  const offset = entry.localHeaderOffset;
  assertRange(bytes, offset, 30);
  if (uint32(bytes, offset) !== 0x04034b50) throw new Error("Cabecera local inválida.");
  const nameLength = uint16(bytes, offset + 26);
  const extraLength = uint16(bytes, offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  assertRange(bytes, dataStart, entry.compressedSize);
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) {
    return new Uint8Array(
      inflateRawSync(compressed, {
        maxOutputLength: MAX_REPOSITORY_FILE_BYTES + 1,
      }),
    );
  }
  throw new Error(`Método de compresión ${entry.method} no compatible.`);
}

export function extractRepositoryZip(bytes: Uint8Array): RepositoryZipResult {
  if (bytes.byteLength > MAX_REPOSITORY_ZIP_BYTES) {
    throw new Error("El ZIP supera el límite seguro de 12 MB.");
  }

  const central = readCentralEntries(bytes);
  const sanitized = central
    .map((entry) => ({ entry, path: sanitizePath(entry.name) }))
    .filter((item): item is { entry: CentralEntry; path: string } => Boolean(item.path));
  const rootPrefix = commonRoot(
    sanitized.filter((item) => !item.path.endsWith("/")).map((item) => item.path),
  );
  const files: ExtractedRepositoryFile[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  const seenPaths = new Set<string>();
  let totalTextBytes = 0;

  for (const item of sanitized) {
    const path = removeRoot(item.path, rootPrefix);
    if (!path || path.endsWith("/")) continue;
    if (seenPaths.has(path)) {
      skipped.push({ path, reason: "Ruta duplicada dentro del ZIP" });
      continue;
    }
    seenPaths.add(path);
    if ((item.entry.flags & 0x1) !== 0) {
      skipped.push({ path, reason: "Archivo cifrado" });
      continue;
    }
    if (blockedPath(item.path) || blockedPath(path)) {
      skipped.push({ path, reason: "Carpeta excluida" });
      continue;
    }
    if (item.entry.uncompressedSize > MAX_REPOSITORY_FILE_BYTES) {
      skipped.push({ path, reason: "Archivo mayor a 1 MB" });
      continue;
    }
    const extension = fileExtension(path);
    if (BINARY_EXTENSIONS.has(extension)) {
      skipped.push({ path, reason: "Formato binario" });
      continue;
    }
    if (files.length >= MAX_REPOSITORY_TEXT_FILES) {
      skipped.push({ path, reason: "Límite de archivos indexables alcanzado" });
      continue;
    }

    let decompressed: Uint8Array;
    try {
      decompressed = decompressEntry(bytes, item.entry);
    } catch (error) {
      skipped.push({
        path,
        reason: error instanceof Error ? error.message : "No se pudo descomprimir",
      });
      continue;
    }
    if (decompressed.byteLength !== item.entry.uncompressedSize) {
      skipped.push({ path, reason: "El tamaño descomprimido no coincide con el directorio central" });
      continue;
    }
    if (decompressed.byteLength > MAX_REPOSITORY_FILE_BYTES) {
      skipped.push({ path, reason: "Archivo mayor a 1 MB" });
      continue;
    }
    if (totalTextBytes + decompressed.byteLength > MAX_REPOSITORY_TOTAL_TEXT_BYTES) {
      skipped.push({ path, reason: "Límite total de texto alcanzado" });
      continue;
    }

    let content: string;
    try {
      content = normalizeTextContent(
        new TextDecoder("utf-8", { fatal: true }).decode(decompressed),
        extension,
      );
    } catch {
      skipped.push({ path, reason: "Contenido binario o codificación no UTF-8" });
      continue;
    }
    const risk = detectDocumentRisk({ fileName: path.split("/").at(-1) ?? path, content });
    if (risk) {
      skipped.push({ path, reason: risk });
      continue;
    }
    if (!content.trim()) {
      skipped.push({ path, reason: "Archivo vacío" });
      continue;
    }

    const normalizedBytes = new TextEncoder().encode(content);
    if (normalizedBytes.byteLength > MAX_REPOSITORY_FILE_BYTES) {
      skipped.push({ path, reason: "El contenido normalizado supera 1 MB" });
      continue;
    }
    if (totalTextBytes + normalizedBytes.byteLength > MAX_REPOSITORY_TOTAL_TEXT_BYTES) {
      skipped.push({ path, reason: "Límite total de texto alcanzado" });
      continue;
    }

    const parts = path.split("/");
    const fileName = parts.pop() ?? path;
    files.push({
      path,
      directoryPath: parts.join("/"),
      fileName,
      extension: extension || null,
      mimeType: MIME_BY_EXTENSION[extension] ?? "text/plain",
      language: LANGUAGE_BY_EXTENSION[extension] ?? (extension ? extension.toUpperCase() : null),
      sizeBytes: normalizedBytes.byteLength,
      checksum: sha256(content),
      content,
    });
    totalTextBytes += normalizedBytes.byteLength;
  }

  if (!files.length) {
    throw new Error("El ZIP no contiene archivos de texto o código seguros para importar.");
  }
  return { files, skipped, rootPrefix };
}
