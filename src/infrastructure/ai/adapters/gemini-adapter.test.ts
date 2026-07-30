import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiAdapter } from "@/infrastructure/ai/adapters/gemini-adapter";

describe("GeminiAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pagina, conserva variantes exactas y elimina duplicados", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: "models/gemini-2.5-flash",
                baseModelId: "gemini-2.5-flash",
                displayName: "Gemini 2.5 Flash",
                inputTokenLimit: 1000000,
                outputTokenLimit: 65536,
                supportedGenerationMethods: ["generateContent"],
                thinking: true,
              },
            ],
            nextPageToken: "second-page",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [
              {
                name: "models/gemini-2.5-flash",
                displayName: "Gemini 2.5 Flash duplicate",
                supportedGenerationMethods: ["generateContent"],
              },
              {
                name: "models/gemini-embedding-001",
                displayName: "Gemini Embedding",
                supportedGenerationMethods: ["embedContent"],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter(
      "https://generativelanguage.googleapis.com/v1beta",
      "test-key",
    );
    const models = await adapter.listModels();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(models).toHaveLength(2);
    expect(models.map((model) => model.apiIdentifier)).toEqual([
      "gemini-2.5-flash",
      "gemini-embedding-001",
    ]);
    expect(models[0]?.capabilities.reasoning).toBe(true);
    expect(models[1]?.modelKind).toBe("embedding");
  });

  it("ejecuta generateContent y normaliza texto y uso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: "Respuesta de Gemini" }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 21,
            candidatesTokenCount: 9,
            totalTokenCount: 30,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter(
      "https://generativelanguage.googleapis.com/v1beta",
      "test-key",
    );
    const result = await adapter.complete({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "Eres un asistente técnico." },
        { role: "user", content: "Hola" },
      ],
      maxOutputTokens: 1024,
    });

    expect(result.content).toBe("Respuesta de Gemini");
    expect(result.finishReason).toBe("STOP");
    expect(result.usage).toEqual({
      inputTokens: 21,
      outputTokens: 9,
      totalTokens: 30,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("models/gemini-2.5-flash:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.systemInstruction).toBeTruthy();
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Hola" }] },
    ]);
  });

  it("procesa streamGenerateContent mediante SSE", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              candidates: [
                { content: { role: "model", parts: [{ text: "Hola " }] } },
              ],
              usageMetadata: { promptTokenCount: 10 },
            })}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              candidates: [
                {
                  content: { role: "model", parts: [{ text: "desde Gemini" }] },
                  finishReason: "STOP",
                },
              ],
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 4,
                totalTokenCount: 14,
              },
            })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter(
      "https://generativelanguage.googleapis.com/v1beta",
      "test-key",
    );
    const deltas: string[] = [];
    const result = await adapter.stream(
      {
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: "Saluda" }],
        stream: true,
      },
      (event) => {
        if (event.type === "text_delta") deltas.push(event.text);
      },
    );

    expect(deltas).toEqual(["Hola ", "desde Gemini"]);
    expect(result.content).toBe("Hola desde Gemini");
    expect(result.finishReason).toBe("STOP");
    expect(result.usage.totalTokens).toBe(14);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(
      "models/gemini-2.5-flash:streamGenerateContent?alt=sse",
    );
  });
});
