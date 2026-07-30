import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenAICompatibleAdapter } from "@/infrastructure/ai/adapters/openai-compatible-adapter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAICompatibleAdapter provider variants", () => {
  it.each([
    ["kimi" as const, "https://api.moonshot.ai/v1", "https://api.moonshot.ai/v1/models"],
    ["deepseek" as const, "https://api.deepseek.com", "https://api.deepseek.com/models"],
  ])("lists models for %s using its official base URL", async (type, baseUrl, expectedUrl) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [{ id: `${type}-chat`, object: "model", owned_by: type }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const adapter = new OpenAICompatibleAdapter({
      type,
      baseUrl,
      apiKey: "test-key",
    });

    const models = await adapter.listModels();

    expect(fetchMock).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(models[0]?.apiIdentifier).toBe(`${type}-chat`);
  });

  it("streams DeepSeek text without exposing reasoning_content", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"reasoning_content":"private","content":"Hola"},"finish_reason":null}]}\n\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":" mundo"},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":2}}\n\n',
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const adapter = new OpenAICompatibleAdapter({
      type: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "test-key",
    });
    const deltas: string[] = [];

    const response = await adapter.stream(
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Saluda" }],
      },
      (event) => {
        if (event.type === "text_delta") deltas.push(event.text);
      },
    );

    expect(deltas.join("")).toBe("Hola mundo");
    expect(response.content).toBe("Hola mundo");
    expect(response.content).not.toContain("private");
    expect(response.usage.totalTokens).toBe(6);
  });
});
