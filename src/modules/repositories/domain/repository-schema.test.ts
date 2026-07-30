import { describe, expect, it } from "vitest";

import {
  conversationFileContextSchema,
  importRepositorySchema,
  proposalFormSchema,
} from "@/modules/repositories/domain/repository-schema";

const projectId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";

describe("repository schemas", () => {
  it("normaliza una URL opcional vacía", () => {
    const result = importRepositorySchema.parse({
      projectId,
      name: "Tienda principal",
      repositoryUrl: "",
      defaultBranch: "main",
    });

    expect(result.repositoryUrl).toBeNull();
  });

  it("exige contenido completo para una propuesta", () => {
    const result = proposalFormSchema.safeParse({
      fileId,
      title: "Actualizar página",
      summary: "",
      proposedContent: "",
      conversationId: "",
      sourceMessageId: "",
      proposedByAgentId: "",
    });

    expect(result.success).toBe(false);
  });

  it("valida el cambio de contexto de conversación", () => {
    expect(
      conversationFileContextSchema.parse({ fileId, selected: true }),
    ).toEqual({ fileId, selected: true });
  });
});
