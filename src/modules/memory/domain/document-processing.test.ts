import { describe, expect, it } from "vitest";

import {
  chunkDocument,
  detectDocumentRisk,
  fileExtension,
  isIndexableTextFile,
  normalizeTextContent,
} from "@/modules/memory/domain/document-processing";

describe("document processing", () => {
  it("detecta extensiones y archivos de texto", () => {
    expect(fileExtension("component.tsx")).toBe("tsx");
    expect(fileExtension(".env")).toBe("");
    expect(isIndexableTextFile("theme.liquid", "")).toBe(true);
  });

  it("bloquea archivos y secretos sensibles", () => {
    expect(detectDocumentRisk({ fileName: ".env.local" })).toContain("No se permiten");
    expect(
      detectDocumentRisk({
        fileName: "notes.txt",
        content: "api_key=abcdefghijklmnopqrstuvwxyz123456",
      }),
    ).toContain("credencial");
  });

  it("normaliza JSON y genera fragmentos con checksum", () => {
    const json = normalizeTextContent('{"name":"NEXUS"}', "json");
    expect(json).toContain('\n  "name"');
    const chunks = chunkDocument("a".repeat(10_000));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
