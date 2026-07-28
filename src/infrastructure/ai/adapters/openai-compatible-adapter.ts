import type {
  AIProvider,
  AIProviderType,
  ProviderHealthResult,
  ProviderModelDescriptor,
} from "@/core/ai/contracts";
import { joinUrl, numberOrNull, ProviderRequestError, requestJson } from "@/infrastructure/ai/http";

type Options = {
  type: "openai" | "openrouter" | "openai_compatible";
  baseUrl: string;
  apiKey: string;
  appUrl?: string;
};
function inferKind(identifier: string): ProviderModelDescriptor["modelKind"] {
  const value = identifier.toLowerCase();
  if (value.includes("embed")) return "embedding";
  if (value.includes("image") || value.includes("dall-e")) return "image";
  if (value.includes("audio") || value.includes("whisper") || value.includes("tts")) return "audio";
  if (value.includes("reason") || /(^|\/)o\d/.test(value)) return "reasoning";
  return "chat";
}
export class OpenAICompatibleAdapter implements AIProvider {
  readonly type: AIProviderType;
  constructor(private readonly options: Options) { this.type = options.type; }
  private headers(): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.apiKey}`,
      Accept: "application/json",
    };
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
    const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    const data = Array.isArray(record.data) ? record.data : [];
    return data.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const model = item as Record<string, unknown>;
      if (typeof model.id !== "string" || !model.id) return [];
      const pricing = typeof model.pricing === "object" && model.pricing !== null
        ? model.pricing as Record<string, unknown> : {};
      const architecture = typeof model.architecture === "object" && model.architecture !== null
        ? model.architecture as Record<string, unknown> : {};
      const parameters = Array.isArray(model.supported_parameters)
        ? model.supported_parameters.filter((v): v is string => typeof v === "string") : [];
      const modalities = Array.isArray(architecture.input_modalities)
        ? architecture.input_modalities.filter((v): v is string => typeof v === "string") : [];
      const promptPrice = numberOrNull(pricing.prompt);
      const completionPrice = numberOrNull(pricing.completion);
      return [{
        apiIdentifier: model.id,
        displayName: typeof model.name === "string" && model.name ? model.name : model.id,
        contextWindow: numberOrNull(model.context_length),
        maxOutputTokens: numberOrNull(
          model.top_provider && typeof model.top_provider === "object"
            ? (model.top_provider as Record<string, unknown>).max_completion_tokens : null,
        ),
        inputCostPerMillion: promptPrice === null ? null : promptPrice * 1_000_000,
        outputCostPerMillion: completionPrice === null ? null : completionPrice * 1_000_000,
        modelKind: inferKind(model.id),
        capabilities: {
          reasoning: parameters.includes("reasoning") || inferKind(model.id) === "reasoning",
          tools: parameters.includes("tools") ? true : null,
          streaming: true,
          vision: modalities.length ? modalities.includes("image") : null,
          files: null,
          structuredOutput: parameters.includes("response_format") || parameters.includes("structured_outputs") ? true : null,
          embeddings: inferKind(model.id) === "embedding",
        },
        sourceMetadata: model,
      } satisfies ProviderModelDescriptor];
    });
  }
  async validateCredentials(): Promise<ProviderHealthResult> {
    const startedAt = Date.now();
    try {
      const models = await this.listModels();
      return { status: "healthy", responseTimeMs: Date.now() - startedAt, modelCount: models.length, errorCode: null, errorMessage: null };
    } catch (error) {
      const requestError = error instanceof ProviderRequestError ? error : null;
      return {
        status: "error",
        responseTimeMs: Date.now() - startedAt,
        modelCount: null,
        errorCode: requestError?.code ?? (requestError?.status ? String(requestError.status) : null),
        errorMessage: error instanceof Error ? error.message : "Error de conexión desconocido.",
      };
    }
  }
}
