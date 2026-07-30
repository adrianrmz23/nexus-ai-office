import type {
  AIProvider,
  AIProviderType,
  ModelAdapter,
} from "@/core/ai/contracts";
import { AnthropicAdapter } from "@/infrastructure/ai/adapters/anthropic-adapter";
import { GeminiAdapter } from "@/infrastructure/ai/adapters/gemini-adapter";
import { OpenAICompatibleAdapter } from "@/infrastructure/ai/adapters/openai-compatible-adapter";

export function createProviderAdapter(input: {
  type: AIProviderType;
  baseUrl: string;
  apiKey: string;
  appUrl?: string;
}): AIProvider {
  if (input.type === "anthropic") {
    return new AnthropicAdapter(input.baseUrl, input.apiKey);
  }

  if (input.type === "gemini") {
    return new GeminiAdapter(input.baseUrl, input.apiKey);
  }

  return new OpenAICompatibleAdapter({
    type: input.type,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    appUrl: input.appUrl,
  });
}

export function createModelAdapter(input: {
  type: AIProviderType;
  baseUrl: string;
  apiKey: string;
  appUrl?: string;
}): ModelAdapter {
  if (input.type === "anthropic") {
    throw new Error(
      "Anthropic todavía no tiene ejecución de chat habilitada.",
    );
  }

  if (input.type === "gemini") {
    return new GeminiAdapter(input.baseUrl, input.apiKey);
  }

  return new OpenAICompatibleAdapter({
    type: input.type,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    appUrl: input.appUrl,
  });
}
