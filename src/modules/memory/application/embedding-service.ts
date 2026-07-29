import { decryptCredential } from "@/lib/security/credential-crypto";
import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";

const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 32;

type EmbeddingModel = {
  id: string;
  providerId: string;
  providerType: string;
  baseUrl: string;
  apiIdentifier: string;
};

type EmbeddingResult = {
  modelId: string;
  providerId: string;
  vectors: number[][];
};

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

async function loadEmbeddingModel(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
): Promise<EmbeddingModel | null> {
  const { data } = await supabase
    .from("ai_models")
    .select(
      "id, provider_id, api_identifier, model_kind, status, ai_providers!inner(id, provider_type, base_url, status, credential_status)",
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .eq("model_kind", "embedding")
    .eq("ai_providers.status", "active")
    .eq("ai_providers.credential_status", "configured")
    .in("ai_providers.provider_type", ["openai", "openrouter", "openai_compatible"])
    .order("api_identifier")
    .limit(50);

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const preferred =
    rows.find((row) => String(row.api_identifier).includes("text-embedding-3-small")) ??
    rows.find((row) => String(row.api_identifier).includes("embedding-3-small")) ??
    rows[0];
  if (!preferred) return null;

  const providerRelation = Array.isArray(preferred.ai_providers)
    ? preferred.ai_providers[0]
    : preferred.ai_providers;
  const provider = recordOf(providerRelation);
  if (!provider.id || !provider.base_url || !provider.provider_type) return null;

  return {
    id: String(preferred.id),
    providerId: String(provider.id),
    providerType: String(provider.provider_type),
    baseUrl: String(provider.base_url),
    apiIdentifier: String(preferred.api_identifier),
  };
}

async function loadApiKey(
  supabase: CurrentWorkspaceContext["supabase"],
  providerId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_provider_credential", {
    p_provider_id: providerId,
  });
  const credential = Array.isArray(data) ? data[0] : null;
  if (error || !credential) return null;

  try {
    return decryptCredential({
      ciphertext: credential.ciphertext,
      iv: credential.iv,
      authTag: credential.auth_tag,
      keyVersion: credential.key_version,
    });
  } catch {
    return null;
  }
}

function validateVector(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== EMBEDDING_DIMENSIONS) return null;
  const vector = value.map(Number);
  return vector.every(Number.isFinite) ? vector : null;
}

async function requestEmbeddingBatch(input: {
  model: EmbeddingModel;
  apiKey: string;
  values: string[];
}): Promise<number[][]> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (input.model.providerType === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    headers["X-Title"] = "Nexus AI Office";
  }

  const body: Record<string, unknown> = {
    model: input.model.apiIdentifier,
    input: input.values,
    encoding_format: "float",
  };
  if (input.model.apiIdentifier.includes("text-embedding-3")) {
    body.dimensions = EMBEDDING_DIMENSIONS;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(joinUrl(input.model.baseUrl, "embeddings"), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      const errorRecord = recordOf(recordOf(payload).error);
      throw new Error(
        typeof errorRecord.message === "string"
          ? errorRecord.message
          : `El proveedor de embeddings respondió con HTTP ${response.status}.`,
      );
    }

    const rows = Array.isArray(recordOf(payload).data)
      ? (recordOf(payload).data as unknown[])
      : [];
    const sorted = rows
      .map((row) => recordOf(row))
      .sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
    const vectors = sorted.map((row) => validateVector(row.embedding));
    if (vectors.length !== input.values.length || vectors.some((vector) => !vector)) {
      throw new Error("El modelo devolvió embeddings con dimensiones incompatibles.");
    }
    return vectors as number[][];
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateEmbeddings(input: {
  supabase: CurrentWorkspaceContext["supabase"];
  workspaceId: string;
  texts: string[];
}): Promise<EmbeddingResult | null> {
  if (!input.texts.length) return null;
  const model = await loadEmbeddingModel(input.supabase, input.workspaceId);
  if (!model) return null;
  const apiKey = await loadApiKey(input.supabase, model.providerId);
  if (!apiKey) return null;

  const vectors: number[][] = [];
  for (let index = 0; index < input.texts.length; index += MAX_BATCH_SIZE) {
    const batch = input.texts.slice(index, index + MAX_BATCH_SIZE);
    vectors.push(...(await requestEmbeddingBatch({ model, apiKey, values: batch })));
  }

  return { modelId: model.id, providerId: model.providerId, vectors };
}

export function vectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
