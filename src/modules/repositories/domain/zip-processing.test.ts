import { describe, expect, it } from "vitest";

import { extractRepositoryZip } from "@/modules/repositories/domain/zip-processing";

function u16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function u32(value: number): number[] {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function storedZip(entries: Array<{ path: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: number[] = [];
  const centralParts: number[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const content = encoder.encode(entry.content);
    const local = [
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(content.length),
      ...u32(content.length),
      ...u16(name.length),
      ...u16(0),
      ...name,
      ...content,
    ];
    localParts.push(...local);

    centralParts.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(content.length),
      ...u32(content.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(localOffset),
      ...name,
    );
    localOffset += local.length;
  }

  const centralOffset = localParts.length;
  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralParts.length),
    ...u32(centralOffset),
    ...u16(0),
  ];
  return Uint8Array.from([...localParts, ...centralParts, ...eocd]);
}

describe("extractRepositoryZip", () => {
  it("normaliza la carpeta raíz e identifica lenguajes", () => {
    const result = extractRepositoryZip(
      storedZip([
        { path: "demo/src/page.tsx", content: "export default function Page() { return <main />; }" },
        { path: "demo/README.md", content: "# Demo" },
      ]),
    );

    expect(result.rootPrefix).toBe("demo");
    expect(result.files.map((file) => file.path)).toEqual(["src/page.tsx", "README.md"]);
    expect(result.files[0]?.language).toBe("TypeScript React");
  });

  it("excluye carpetas generadas y archivos sensibles", () => {
    const result = extractRepositoryZip(
      storedZip([
        { path: "demo/src/index.ts", content: "export const value = 1;" },
        { path: "demo/node_modules/pkg/index.js", content: "module.exports = {};" },
        { path: "demo/.env.local", content: "DATABASE_URL=postgres://secret" },
      ]),
    );

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe("src/index.ts");
    expect(result.skipped.some((item) => item.path.includes("node_modules"))).toBe(true);
    expect(result.skipped.some((item) => item.path === ".env.local")).toBe(true);
  });

  it("omite rutas duplicadas sin crear dos archivos", () => {
    const result = extractRepositoryZip(
      storedZip([
        { path: "demo/src/index.ts", content: "export const first = true;" },
        { path: "demo/src/index.ts", content: "export const second = true;" },
      ]),
    );

    expect(result.files).toHaveLength(1);
    expect(result.skipped).toContainEqual({
      path: "src/index.ts",
      reason: "Ruta duplicada dentro del ZIP",
    });
  });
});
