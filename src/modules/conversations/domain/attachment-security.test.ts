import { describe, expect, it } from "vitest";

import { detectSensitiveAttachment } from "@/modules/conversations/domain/attachment-security";

describe("detectSensitiveAttachment", () => {
  it("bloquea archivos de entorno aunque incluyan una ruta", () => {
    expect(
      detectSensitiveAttachment({
        fileName: "config/.env.local",
        content: "NEXT_PUBLIC_URL=https://example.com",
      }),
    ).not.toBeNull();
  });

  it("bloquea claves privadas y tokens reconocibles", () => {
    expect(
      detectSensitiveAttachment({
        fileName: "notes.txt",
        content: "-----BEGIN OPENSSH PRIVATE KEY-----",
      }),
    ).toContain("clave privada");
  });

  it("permite código ordinario", () => {
    expect(
      detectSensitiveAttachment({
        fileName: "page.tsx",
        content: "export default function Page() { return <main>Nexus</main>; }",
      }),
    ).toBeNull();
  });
});
