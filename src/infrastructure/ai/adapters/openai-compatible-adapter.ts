import type {
  AIProvider,
  AIProviderType,
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

type Options = {
  type: "openai" | "openrouter" | "openai_compatible";
  baseUrl: string;
  apiKey: string;
  appUrl?: string;
};

type Usage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

function inferKind(identifier: string): ProviderModelDescriptor["modelKind"] {
  const value = identifier.toLowerCase();
  if (value.includes("embed")) return "embedding";
  if (value.includes("image") || value.includes("dall-e")) return "image";
  if (value.includes("audio") || value.includes("whisper") || value.includes("tts")) {
    return "audio";
  }
  if (value.includes("reason") || /(^|\/)o\d/.test(value)) return "reasoning";
  return "chat";
}

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

function parseJsonArguments(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return recordOf(parsed);
  } catch {
    return { raw: value };
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

function extractError(body: unknown, status: number): ProviderRequestError {
  const record = recordOf(body);
  const nested = recordOf(record.error);
  const message =
    stringOrNull(nested.message) ??
    stringOrNull(record.message) ??
    `El proveedor respondió con HTTP ${status}.`;
  const code = stringOrNull(nested.code) ?? stringOrNull(record.code);
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

function openAIInput(request: ChatCompletionRequest) {
  const systemMessages = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean);
  const input = request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "tool" ? "user" : message.role,
      content: message.content,
    }));

  return {
    model: request.model,
    input,
    instructions: systemMessages.length ? systemMessages.join("\n\n") : undefined,
    max_output_tokens: request.maxOutputTokens,
    temperature: request.temperature,
    tools: request.tools?.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false,
    })),
    store: false,
  };
}

function chatCompletionInput(request: ChatCompletionRequest) {
  return {
    model: request.model,
    messages: request.messages.map((message) => ({
      role: message.role,
      content: message.content,
      name: message.name,
      tool_call_id: message.toolCallId,
    })),
    max_tokens: request.maxOutputTokens,
    temperature: request.temperature,
    tools: request.tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    })),
    stream: request.stream,
    stream_options: request.stream ? { include_usage: true } : undefined,
  };
}

function parseOpenAIOutputText(response: Record<string, unknown>): string {
  const direct = stringOrNull(response.output_text);
  if (direct) return direct;

  return arrayOf(response.output)
    .flatMap((item) => arrayOf(recordOf(item).content))
    .map((content) => stringOrNull(recordOf(content).text) ?? "")
    .join("");
}

function parseOpenAIToolCalls(response: Record<string, unknown>): NormalizedToolCall[] {
  return arrayOf(response.output).flatMap((item) => {
    const record = recordOf(item);
    if (record.type !== "function_call") return [];
    const name = stringOrNull(record.name);
    if (!name) return [];
    return [
      {
        id: stringOrNull(record.call_id) ?? stringOrNull(record.id) ?? crypto.randomUUID(),
        name,
        arguments: parseJsonArguments(record.arguments),
      },
    ];
  });
}

function parseChatToolCalls(message: Record<string, unknown>): NormalizedToolCall[] {
  return arrayOf(message.tool_calls).flatMap((item) => {
    const record = recordOf(item);
    const fn = recordOf(record.function);
    const name = stringOrNull(fn.name);
    if (!name) return [];
    return [
      {
        id: stringOrNull(record.id) ?? crypto.randomUUID(),
        name,
        arguments: parseJsonArguments(fn.arguments),
      },
    ];
  });
}

export class OpenAICompatibleAdapter implements AIProvider, ModelAdapter {
  readonly type: AIProviderType;

  constructor(private readonly options: Options) {
    this.type = options.type;
  }

  private headers(contentType = false): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      Accept: "application/json",
    };

    if (contentType) headers["Content-Type"] = "application/json";

    if (this.options.type === "openrouter") {
      headers["HTTP-Referer"] = this.options.appUrl ?? "http://localhost:3000";
      headers["X-Title"] = "Nexus AI Office";
    }

    return headers;
  }

  async listModels(): Promise<ProviderModelDescriptor[]> {
    const body = await requestJson(joinUrl(this.options.baseUrl, "models"), {
      method: "GET",
      headers: this.headers(),
    });
    const record = recordOf(body);
    const data = arrayOf(record.data);

    return data.flatMap((item) => {
      const model = recordOf(item);
      if (typeof model.id !== "string" || !model.id) return [];
      const pricing = recordOf(model.pricing);
      const architecture = recordOf(model.architecture);
      const parameters = arrayOf(model.supported_parameters).filter(
        (value): value is string => typeof value === "string",
      );
      const modalities = arrayOf(architecture.input_modalities).filter(
        (value): value is string => typeof value === "string",
      );
      const promptPrice = numberOrNull(pricing.prompt);
      const completionPrice = numberOrNull(pricing.completion);

      return [
        {
          apiIdentifier: model.id,
          displayName:
            typeof model.name === "string" && model.name ? model.name : model.id,
          contextWindow: numberOrNull(model.context_length),
          maxOutputTokens: numberOrNull(recordOf(model.top_provider).max_completion_tokens),
          inputCostPerMillion:
            promptPrice === null ? null : promptPrice * 1_000_000,
          outputCostPerMillion:
            completionPrice === null ? null : completionPrice * 1_000_000,
          modelKind: inferKind(model.id),
          capabilities: {
            reasoning:
              parameters.includes("reasoning") || inferKind(model.id) === "reasoning",
            tools: parameters.includes("tools") ? true : null,
            streaming: true,
            vision: modalities.length ? modalities.includes("image") : null,
            files: null,
            structuredOutput:
              parameters.includes("response_format") ||
              parameters.includes("structured_outputs")
                ? true
                : null,
            embeddings: inferKind(model.id) === "embedding",
          },
          sourceMetadata: model,
        } satisfies ProviderModelDescriptor,
      ];
    });
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
    const isResponsesApi = this.options.type === "openai";
    const target = isResponsesApi
      ? joinUrl(this.options.baseUrl, "responses")
      : joinUrl(this.options.baseUrl, "chat/completions");
    const linkedSignal = combineSignals(request.signal, 120_000);

    try {
      const response = await fetch(target, {
        method: "POST",
        headers: this.headers(true),
        body: JSON.stringify(
          isResponsesApi
            ? openAIInput({ ...request, stream: false })
            : chatCompletionInput({ ...request, stream: false }),
        ),
        cache: "no-store",
        signal: linkedSignal.signal,
      });
      const body = await responseBody(response);
      if (!response.ok) throw extractError(body, response.status);
      const record = recordOf(body);

      if (isResponsesApi) {
        const usageRecord = recordOf(record.usage);
        const inputTokens = numberOrNull(usageRecord.input_tokens);
        const outputTokens = numberOrNull(usageRecord.output_tokens);
        return {
          provider: this.type,
          model: request.model,
          content: parseOpenAIOutputText(record),
          finishReason: stringOrNull(record.status),
          toolCalls: parseOpenAIToolCalls(record),
          usage: {
            inputTokens,
            outputTokens,
            totalTokens:
              inputTokens === null || outputTokens === null
                ? null
                : inputTokens + outputTokens,
          },
          raw: body,
        };
      }

      const choice = recordOf(arrayOf(record.choices)[0]);
      const message = recordOf(choice.message);
      const usageRecord = recordOf(record.usage);
      return {
        provider: this.type,
        model: request.model,
        content: stringOrNull(message.content) ?? "",
        finishReason: stringOrNull(choice.finish_reason),
        toolCalls: parseChatToolCalls(message),
        usage: {
          inputTokens: numberOrNull(usageRecord.prompt_tokens),
          outputTokens: numberOrNull(usageRecord.completion_tokens),
          totalTokens: numberOrNull(usageRecord.total_tokens),
        },
        raw: body,
      };
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderRequestError(
          request.signal?.aborted
            ? "La ejecución fue cancelada."
            : "La ejecución excedió el tiempo de espera.",
          null,
          request.signal?.aborted ? "cancelled" : "timeout",
        );
      }
      throw new ProviderRequestError(
        error instanceof Error ? error.message : "No fue posible ejecutar el modelo.",
        null,
        "network_error",
      );
    } finally {
      linkedSignal.dispose();
    }
  }

  async stream(
    request: ChatCompletionRequest,
    handler: StreamingHandler,
  ): Promise<ChatCompletionResponse> {
    const isResponsesApi = this.options.type === "openai";
    const target = isResponsesApi
      ? joinUrl(this.options.baseUrl, "responses")
      : joinUrl(this.options.baseUrl, "chat/completions");
    const linkedSignal = combineSignals(request.signal, 180_000);
    let content = "";
    let finishReason: string | null = null;
    let usage: Usage = { inputTokens: null, outputTokens: null };
    const toolCalls: NormalizedToolCall[] = [];
    let rawCompleted: unknown = null;
    let sawCompletion = false;

    try {
      const response = await fetch(target, {
        method: "POST",
        headers: this.headers(true),
        body: JSON.stringify(
          isResponsesApi
            ? { ...openAIInput({ ...request, stream: true }), stream: true }
            : chatCompletionInput({ ...request, stream: true }),
        ),
        cache: "no-store",
        signal: linkedSignal.signal,
      });

      if (!response.ok) {
        const body = await responseBody(response);
        throw extractError(body, response.status);
      }

      if (!response.body) {
        throw new ProviderRequestError(
          "El proveedor no devolvió un stream legible.",
          response.status,
          "missing_stream",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processPayload = async (payload: string) => {
        if (!payload) return;
        if (payload === "[DONE]") {
          sawCompletion = true;
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(payload) as unknown;
        } catch {
          return;
        }
        const event = recordOf(parsed);

        if (isResponsesApi) {
          const type = stringOrNull(event.type);
          if (type === "response.output_text.delta") {
            const delta = stringOrNull(event.delta) ?? "";
            if (delta) {
              content += delta;
              await handler({ type: "text_delta", text: delta });
            }
            return;
          }
          if (type === "response.output_item.done") {
            const item = recordOf(event.item);
            if (item.type === "function_call") {
              const name = stringOrNull(item.name);
              if (name) {
                const call = {
                  id:
                    stringOrNull(item.call_id) ??
                    stringOrNull(item.id) ??
                    crypto.randomUUID(),
                  name,
                  arguments: parseJsonArguments(item.arguments),
                };
                toolCalls.push(call);
                await handler({ type: "tool_call", call });
              }
            }
            return;
          }
          if (type === "response.completed" || type === "response.incomplete") {
            sawCompletion = true;
            const completedResponse = recordOf(event.response);
            rawCompleted = completedResponse;
            const usageRecord = recordOf(completedResponse.usage);
            usage = {
              inputTokens: numberOrNull(usageRecord.input_tokens),
              outputTokens: numberOrNull(usageRecord.output_tokens),
            };
            finishReason =
              stringOrNull(completedResponse.status) ??
              (type === "response.incomplete" ? "incomplete" : "completed");
            if (!content) content = parseOpenAIOutputText(completedResponse);
            await handler({
              type: "usage",
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            });
            return;
          }
          if (type === "response.failed" || type === "error") {
            const errorRecord = recordOf(event.error ?? recordOf(event.response).error);
            const message =
              stringOrNull(errorRecord.message) ?? "El proveedor interrumpió la respuesta.";
            await handler({ type: "error", message });
            throw new ProviderRequestError(
              message,
              null,
              stringOrNull(errorRecord.code),
            );
          }
          return;
        }

        const choice = recordOf(arrayOf(event.choices)[0]);
        const delta = recordOf(choice.delta);
        const text = stringOrNull(delta.content) ?? "";
        if (text) {
          content += text;
          await handler({ type: "text_delta", text });
        }
        finishReason = stringOrNull(choice.finish_reason) ?? finishReason;

        const eventUsage = recordOf(event.usage);
        const inputTokens = numberOrNull(eventUsage.prompt_tokens);
        const outputTokens = numberOrNull(eventUsage.completion_tokens);
        if (inputTokens !== null || outputTokens !== null) {
          usage = { inputTokens, outputTokens };
          await handler({ type: "usage", inputTokens, outputTokens });
        }
      };

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

      if (!sawCompletion && finishReason === null) {
        throw new ProviderRequestError(
          "El stream terminó antes de que el proveedor confirmara la respuesta.",
          null,
          "incomplete_stream",
        );
      }

      await handler({ type: "completed", finishReason });
      return {
        provider: this.type,
        model: request.model,
        content,
        finishReason,
        toolCalls,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens:
            usage.inputTokens === null || usage.outputTokens === null
              ? null
              : usage.inputTokens + usage.outputTokens,
        },
        raw: rawCompleted,
      };
    } catch (error) {
      if (error instanceof ProviderRequestError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ProviderRequestError(
          request.signal?.aborted
            ? "La ejecución fue cancelada."
            : "La ejecución excedió el tiempo de espera.",
          null,
          request.signal?.aborted ? "cancelled" : "timeout",
        );
      }
      throw new ProviderRequestError(
        error instanceof Error ? error.message : "No fue posible ejecutar el modelo.",
        null,
        "network_error",
      );
    } finally {
      linkedSignal.dispose();
    }
  }
}
