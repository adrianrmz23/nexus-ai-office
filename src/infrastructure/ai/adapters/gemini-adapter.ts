import type { AIProvider, ProviderHealthResult, ProviderModelDescriptor } from "@/core/ai/contracts";
import { joinUrl, numberOrNull, ProviderRequestError, requestJson } from "@/infrastructure/ai/http";

export class GeminiAdapter implements AIProvider {
  readonly type = "gemini" as const;
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}
  async listModels(): Promise<ProviderModelDescriptor[]> {
    const body = await requestJson(`${joinUrl(this.baseUrl, "models")}?pageSize=1000`, {
      method: "GET",
      headers: { "x-goog-api-key": this.apiKey, Accept: "application/json" },
    });
    const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    const data = Array.isArray(record.models) ? record.models : [];
    return data.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const model = item as Record<string, unknown>;
      const fullName = typeof model.name === "string" ? model.name : "";
      const identifier = typeof model.baseModelId === "string" ? model.baseModelId : fullName.replace(/^models\//, "");
      if (!identifier) return [];
      const methods = Array.isArray(model.supportedGenerationMethods)
        ? model.supportedGenerationMethods.filter((v): v is string => typeof v === "string")
        : [];
      const description = typeof model.description === "string" ? model.description.toLowerCase() : "";
      const isEmbedding = methods.some((method) => method.toLowerCase().includes("embed"));
      return [{
        apiIdentifier: identifier,
        displayName: typeof model.displayName === "string" ? model.displayName : identifier,
        contextWindow: numberOrNull(model.inputTokenLimit),
        maxOutputTokens: numberOrNull(model.outputTokenLimit),
        inputCostPerMillion: null,
        outputCostPerMillion: null,
        modelKind: isEmbedding ? "embedding" : "multimodal",
        capabilities: {
          reasoning: description.includes("thinking") ? true : null,
          tools: methods.includes("generateContent") ? null : false,
          streaming: methods.includes("streamGenerateContent") || methods.includes("generateContent"),
          vision: isEmbedding ? false : null,
          files: isEmbedding ? false : null,
          structuredOutput: null,
          embeddings: isEmbedding,
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
