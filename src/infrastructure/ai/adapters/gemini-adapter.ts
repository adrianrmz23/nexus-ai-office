import type {
  AIProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelAdapter,
  NormalizedToolCall,
  ProviderHealthResult,
  ProviderModelDescriptor,
  StreamingHandler,
} from "@/core/ai/contracts";
import {
  joinUrl,
  numberOrNull,
  ProviderRequestError,
  requestJson,
} from "@/infrastructure/ai/http";

const MAX_MODEL_PAGES = 20;
const GENERATION_TIMEOUT_MS = 180_000;

type GeminiUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function inferModelKind(
  identifier: string,
  methods: string[],
): ProviderModelDescriptor["modelKind"] {
  const normalizedIdentifier = identifier.toLowerCase();
  const normalizedMethods = methods.map((method) => method.toLowerCase());

  if (normalizedMethods.some((method) => method.includes("embed"))) {
    return "embedding";
  }

  if (
    normalizedIdentifier.includes("imagen") ||
    normalizedIdentifier.includes("image-generation") ||
    normalizedIdentifier.includes("-image")
  ) {
    return "image";
  }

  if (
    normalizedIdentifier.includes("lyria") ||
    normalizedIdentifier.includes("audio") ||
    normalizedIdentifier.includes("chirp") ||
    normalizedIdentifier.includes("tts")
  ) {
    return "audio";
  }

  if (normalizedMethods.some((method) => method.includes("generatecontent"))) {
    return "multimodal";
  }

  return "other";
}

function descriptorFromModel(value: unknown): ProviderModelDescriptor | null {
  if (typeof value !== "object" || value === null) return null;

  const model = value as Record<string, unknown>;
  const resourceName = typeof model.name === "string" ? model.name : "";
  const apiIdentifier = resourceName.replace(/^models\//, "").trim();

  if (!apiIdentifier) return null;

  const methods = stringArray(model.supportedGenerationMethods);
  const normalizedMethods = methods.map((method) => method.toLowerCase());
  const modelKind = inferModelKind(apiIdentifier, methods);
  const supportsGeneration = normalizedMethods.some((method) =>
    method.includes("generatecontent"),
  );
  const supportsEmbedding = normalizedMethods.some((method) =>
    method.includes("embed"),
  );
  const thinking = typeof model.thinking === "boolean" ? model.thinking : null;

  return {
    // El nombre exacto devuelto por models.list evita colapsar variantes estables,
    // preview y versionadas que pueden compartir un baseModelId.
    apiIdentifier,
    displayName:
      typeof model.displayName === "string" && model.displayName.trim()
        ? model.displayName.trim()
        : apiIdentifier,
    contextWindow: numberOrNull(model.inputTokenLimit),
    maxOutputTokens: numberOrNull(model.outputTokenLimit),
    inputCostPerMillion: null,
    outputCostPerMillion: null,
    modelKind,
    capabilities: {
      reasoning: thinking,
      tools: supportsGeneration ? null : false,
      streaming: supportsGeneration,
      vision: modelKind === "embedding" || modelKind === "audio" ? false : null,
      files: modelKind === "embedding" ? false : null,
      structuredOutput: supportsGeneration ? null : false,
      embeddings: supportsEmbedding,
    },
    sourceMetadata: {
      ...model,
      resourceName,
      baseModelId:
        typeof model.baseModelId === "string" ? model.baseModelId : null,
    },
  };
}

function parseJsonArguments(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value.trim()) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    return recordOf(parsed);
  } catch {
    return { raw: value };
  }
}

function normalizedModelIdentifier(identifier: string): string {
  return identifier.replace(/^models\//, "").trim();
}

function generationUrl(baseUrl: string, model: string, stream: boolean): string {
  const method = stream ? "streamGenerateContent" : "generateContent";
  const target = joinUrl(
    baseUrl,
    `models/${encodeURIComponent(normalizedModelIdentifier(model))}:${method}`,
  );
  return stream ? `${target}?alt=sse` : target;
}

function geminiInput(request: ChatCompletionRequest): Record<string, unknown> {
  const systemText = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const message of request.messages) {
    if (message.role === "system" || !message.content.trim()) continue;

    const role = message.role === "assistant" ? "model" : "user";
    const previous = contents.at(-1);

    // Gemini espera turnos user/model alternados. Si NEXUS recibe dos mensajes
    // consecutivos del mismo rol, se combinan sin perder el contenido.
    if (previous?.role === role) {
      previous.parts.push({ text: message.content });
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  const generationConfig: Record<string, unknown> = {};
  if (request.maxOutputTokens !== undefined) {
    generationConfig.maxOutputTokens = request.maxOutputTokens;
  }
  if (request.temperature !== undefined) {
    generationConfig.temperature = request.temperature;
  }

  const body: Record<string, unknown> = { contents };

  if (systemText) {
    body.systemInstruction = {
      role: "user",
      parts: [{ text: systemText }],
    };
  }

  if (Object.keys(generationConfig).length) {
    body.generationConfig = generationConfig;
  }

  if (request.tools?.length) {
    body.tools = [
      {
        functionDeclarations: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        })),
      },
    ];
  }

  return body;
}

function parseUsage(response: Record<string, unknown>): GeminiUsage {
  const usage = recordOf(response.usageMetadata);
  const inputTokens = numberOrNull(usage.promptTokenCount);
  const outputTokens = numberOrNull(usage.candidatesTokenCount);
  const explicitTotal = numberOrNull(usage.totalTokenCount);

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      explicitTotal ??
      (inputTokens === null || outputTokens === null
        ? null
        : inputTokens + outputTokens),
  };
}

function candidateOf(response: Record<string, unknown>): Record<string, unknown> {
  return recordOf(arrayOf(response.candidates)[0]);
}

function partsOf(response: Record<string, unknown>): Array<Record<string, unknown>> {
  const candidate = candidateOf(response);
  const content = recordOf(candidate.content);
  return arrayOf(content.parts).map(recordOf);
}

function parseText(response: Record<string, unknown>): string {
  return partsOf(response)
    .map((part) => stringOrNull(part.text) ?? "")
    .join("");
}

function parseToolCalls(response: Record<string, unknown>): NormalizedToolCall[] {
  return partsOf(response).flatMap((part) => {
    const functionCall = recordOf(part.functionCall);
    const name = stringOrNull(functionCall.name);
    if (!name) return [];

    return [
      {
        id: crypto.randomUUID(),
        name,
        arguments: parseJsonArguments(functionCall.args),
      },
    ];
  });
}

function finishReasonOf(response: Record<string, unknown>): string | null {
  return stringOrNull(candidateOf(response).finishReason);
}

function extractError(body: unknown, status: number): ProviderRequestError {
  const record = recordOf(body);
  const nested = recordOf(record.error);
  const message =
    stringOrNull(nested.message) ??
    stringOrNull(record.message) ??
    `Google Gemini respondió con HTTP ${status}.`;
  const codeValue = nested.code ?? record.code;
  const code =
    typeof codeValue === "number"
      ? String(codeValue)
      : stringOrNull(codeValue);

  return new ProviderRequestError(message, status, code);
}

async function responseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function combineSignals(
  requestSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void } {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const combinedController = new AbortController();

  const abort = () => combinedController.abort();
  requestSignal?.addEventListener("abort", abort, { once: true });
  timeoutController.signal.addEventListener("abort", abort, { once: true });

  return {
    signal: combinedController.signal,
    dispose: () => {
      clearTimeout(timeout);
      requestSignal?.removeEventListener("abort", abort);
      timeoutController.signal.removeEventListener("abort", abort);
    },
  };
}

function providerError(error: unknown, requestSignal?: AbortSignal): ProviderRequestError {
  if (error instanceof ProviderRequestError) return error;

  if (error instanceof Error && error.name === "AbortError") {
    return new ProviderRequestError(
      requestSignal?.aborted
        ? "La ejecución fue cancelada."
        : "La ejecución de Gemini excedió el tiempo de espera.",
      null,
      requestSignal?.aborted ? "cancelled" : "timeout",
    );
  }

  return new ProviderRequestError(
    error instanceof Error
      ? error.message
      : "No fue posible ejecutar el modelo de Gemini.",
    null,
    "network_error",
  );
}

export class GeminiAdapter implements AIProvider, ModelAdapter {
  readonly type = "gemini" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers(contentType = false): HeadersInit {
    const headers: Record<string, string> = {
      "x-goog-api-key": this.apiKey,
      Accept: "application/json",
    };
    if (contentType) headers["Content-Type"] = "application/json";
    return headers;
  }

  async listModels(): Promise<ProviderModelDescriptor[]> {
    const descriptors = new Map<string, ProviderModelDescriptor>();
    const seenPageTokens = new Set<string>();
    let pageToken: string | null = null;

    for (let page = 0; page < MAX_MODEL_PAGES; page += 1) {
      const query = new URLSearchParams({ pageSize: "1000" });
      if (pageToken) query.set("pageToken", pageToken);

      const body = await requestJson(
        `${joinUrl(this.baseUrl, "models")}?${query.toString()}`,
        {
          method: "GET",
          headers: this.headers(),
        },
      );

      const record = recordOf(body);
      const models = Array.isArray(record.models) ? record.models : [];

      for (const item of models) {
        const descriptor = descriptorFromModel(item);
        if (descriptor && !descriptors.has(descriptor.apiIdentifier)) {
          descriptors.set(descriptor.apiIdentifier, descriptor);
        }
      }

      const nextPageToken =
        typeof record.nextPageToken === "string" && record.nextPageToken.trim()
          ? record.nextPageToken.trim()
          : null;

      if (!nextPageToken || seenPageTokens.has(nextPageToken)) break;

      seenPageTokens.add(nextPageToken);
      pageToken = nextPageToken;
    }

    return [...descriptors.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName, "es"),
    );
  }

  async validateCredentials(): Promise<ProviderHealthResult> {
    const startedAt = Date.now();

    try {
      const models = await this.listModels();
      return {
        status: "healthy",
        responseTimeMs: Date.now() - startedAt,
        modelCount: models.length,
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      const requestError = error instanceof ProviderRequestError ? error : null;
      return {
        status: "error",
        responseTimeMs: Date.now() - startedAt,
        modelCount: null,
        errorCode:
          requestError?.code ??
          (requestError?.status ? String(requestError.status) : null),
        errorMessage:
          error instanceof Error ? error.message : "Error de conexión desconocido.",
      };
    }
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const linkedSignal = combineSignals(request.signal, GENERATION_TIMEOUT_MS);

    try {
      const response = await fetch(generationUrl(this.baseUrl, request.model, false), {
        method: "POST",
        headers: this.headers(true),
        body: JSON.stringify(geminiInput({ ...request, stream: false })),
        cache: "no-store",
        signal: linkedSignal.signal,
      });
      const body = await responseBody(response);
      if (!response.ok) throw extractError(body, response.status);

      const record = recordOf(body);
      const usage = parseUsage(record);

      return {
        provider: this.type,
        model: request.model,
        content: parseText(record),
        finishReason: finishReasonOf(record),
        toolCalls: parseToolCalls(record),
        usage,
        raw: body,
      };
    } catch (error) {
      throw providerError(error, request.signal);
    } finally {
      linkedSignal.dispose();
    }
  }

  async stream(
    request: ChatCompletionRequest,
    handler: StreamingHandler,
  ): Promise<ChatCompletionResponse> {
    const linkedSignal = combineSignals(request.signal, GENERATION_TIMEOUT_MS);
    let content = "";
    let finishReason: string | null = null;
    let usage: GeminiUsage = {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    };
    const toolCalls: NormalizedToolCall[] = [];
    const toolCallKeys = new Set<string>();
    let lastChunk: unknown = null;

    try {
      const response = await fetch(generationUrl(this.baseUrl, request.model, true), {
        method: "POST",
        headers: this.headers(true),
        body: JSON.stringify(geminiInput({ ...request, stream: true })),
        cache: "no-store",
        signal: linkedSignal.signal,
      });

      if (!response.ok) {
        const body = await responseBody(response);
        throw extractError(body, response.status);
      }

      if (!response.body) {
        throw new ProviderRequestError(
          "Gemini no devolvió un stream legible.",
          response.status,
          "missing_stream",
        );
      }

      const processPayload = async (payload: string) => {
        if (!payload) return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload) as unknown;
        } catch {
          return;
        }

        const chunk = recordOf(parsed);
        lastChunk = parsed;

        const text = parseText(chunk);
        if (text) {
          content += text;
          await handler({ type: "text_delta", text });
        }

        for (const call of parseToolCalls(chunk)) {
          const key = `${call.name}:${JSON.stringify(call.arguments)}`;
          if (toolCallKeys.has(key)) continue;
          toolCallKeys.add(key);
          toolCalls.push(call);
          await handler({ type: "tool_call", call });
        }

        finishReason = finishReasonOf(chunk) ?? finishReason;
        const chunkUsage = parseUsage(chunk);
        if (
          chunkUsage.inputTokens !== null ||
          chunkUsage.outputTokens !== null ||
          chunkUsage.totalTokens !== null
        ) {
          usage = chunkUsage;
          await handler({
            type: "usage",
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
        }
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          await processPayload(line.slice(5).trim());
        }

        if (done) break;
      }

      if (buffer.startsWith("data:")) {
        await processPayload(buffer.slice(5).trim());
      }

      if (!content && !toolCalls.length) {
        throw new ProviderRequestError(
          "Gemini terminó la respuesta sin contenido utilizable.",
          null,
          "empty_response",
        );
      }

      finishReason ??= "STOP";
      await handler({ type: "completed", finishReason });

      return {
        provider: this.type,
        model: request.model,
        content,
        finishReason,
        toolCalls,
        usage,
        raw: lastChunk,
      };
    } catch (error) {
      throw providerError(error, request.signal);
    } finally {
      linkedSignal.dispose();
    }
  }
}
