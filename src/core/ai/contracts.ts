export type AIProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "openai_compatible";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
};

export type NormalizedToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ChatCompletionResponse = {
  provider: AIProviderType;
  model: string;
  content: string;
  finishReason: string | null;
  toolCalls: NormalizedToolCall[];
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  raw: unknown;
};

export type StreamingEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; call: NormalizedToolCall }
  | { type: "usage"; inputTokens: number | null; outputTokens: number | null }
  | { type: "completed"; finishReason: string | null }
  | { type: "error"; message: string };

export type StreamingHandler = (event: StreamingEvent) => void | Promise<void>;

export type ProviderModelDescriptor = {
  apiIdentifier: string;
  displayName: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputCostPerMillion: number | null;
  outputCostPerMillion: number | null;
  modelKind:
    | "chat"
    | "reasoning"
    | "embedding"
    | "image"
    | "audio"
    | "multimodal"
    | "other";
  capabilities: {
    reasoning: boolean | null;
    tools: boolean | null;
    streaming: boolean | null;
    vision: boolean | null;
    files: boolean | null;
    structuredOutput: boolean | null;
    embeddings: boolean | null;
  };
  sourceMetadata: Record<string, unknown>;
};

export type ProviderHealthResult = {
  status: "healthy" | "error";
  responseTimeMs: number;
  modelCount: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export interface AIProvider {
  readonly type: AIProviderType;
  listModels(): Promise<ProviderModelDescriptor[]>;
  validateCredentials(): Promise<ProviderHealthResult>;
}

export interface ModelAdapter {
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(
    request: ChatCompletionRequest,
    handler: StreamingHandler,
  ): Promise<ChatCompletionResponse>;
}
