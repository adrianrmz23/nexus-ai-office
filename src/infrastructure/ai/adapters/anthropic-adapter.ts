import type { AIProvider, ProviderHealthResult, ProviderModelDescriptor } from "@/core/ai/contracts";
import { joinUrl, ProviderRequestError, requestJson } from "@/infrastructure/ai/http";

export class AnthropicAdapter implements AIProvider {
  readonly type = "anthropic" as const;
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}
  async listModels(): Promise<ProviderModelDescriptor[]> {
    const body = await requestJson(`${joinUrl(this.baseUrl, "models")}?limit=1000`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        Accept: "application/json",
      },
    });
    const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    const data = Array.isArray(record.data) ? record.data : [];
    return data.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const model = item as Record<string, unknown>;
      if (typeof model.id !== "string" || !model.id) return [];
      return [{
        apiIdentifier: model.id,
        displayName: typeof model.display_name === "string" ? model.display_name : model.id,
        contextWindow: null,
        maxOutputTokens: null,
        inputCostPerMillion: null,
        outputCostPerMillion: null,
        modelKind: "chat",
        capabilities: {
          reasoning: null,
          tools: true,
          streaming: true,
          vision: null,
          files: null,
          structuredOutput: null,
          embeddings: false,
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
