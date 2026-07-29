import { describe, expect, it } from "vitest";

import { chatRequestSchema } from "@/modules/conversations/domain/conversation-schema";

describe("chatRequestSchema", () => {
  it("acepta un mensaje con un adjunto de texto pequeño", () => {
    const result = chatRequestSchema.safeParse({
      content: "Revisa este archivo",
      mode: "individual",
      agentId: null,
      modelId: null,
      taskType: "coding",
      attachments: [
        {
          fileName: "page.tsx",
          mimeType: "text/typescript",
          sizeBytes: 120,
          language: "tsx",
          content: "export default function Page() { return null; }",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza más de tres adjuntos", () => {
    const attachment = {
      fileName: "a.txt",
      mimeType: "text/plain",
      sizeBytes: 1,
      language: null,
      content: "a",
    };
    const result = chatRequestSchema.safeParse({
      content: "Analiza",
      mode: "team",
      agentId: null,
      modelId: null,
      taskType: "analysis",
      attachments: [attachment, attachment, attachment, attachment],
    });

    expect(result.success).toBe(false);
  });
});
