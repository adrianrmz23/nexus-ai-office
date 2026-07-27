import { describe, expect, it } from "vitest";

import {
  agentFormSchema,
  parseModelKeys,
} from "@/modules/agents/domain/agent-schema";

const validInput = {
  name: "Agente frontend",
  description: "Especialista en interfaces y componentes reutilizables.",
  role: "frontend" as const,
  scope: "global" as const,
  icon: "code-2" as const,
  color: "#55e6c1",
  avatarUrl: "",
  instructions:
    "Revisa el código existente y entrega archivos completos con pasos de validación.",
  preferredModelKey: "",
  alternativeModelKeys: "",
  creativity: 25,
  memoryEnabled: true,
  allowedTools: ["read_files", "create_artifacts"] as const,
  escalationRules: "Solicita revisión cuando una modificación afecte autenticación.",
  status: "active" as const,
  technologyIds: [] as string[],
  collaboratorIds: [] as string[],
};

describe("agentFormSchema", () => {
  it("acepta una configuración válida", () => {
    expect(agentFormSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza instrucciones demasiado breves", () => {
    const result = agentFormSchema.safeParse({
      ...validInput,
      instructions: "Muy corto",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza herramientas repetidas", () => {
    const result = agentFormSchema.safeParse({
      ...validInput,
      allowedTools: ["read_files", "read_files"],
    });

    expect(result.success).toBe(false);
  });
});

describe("parseModelKeys", () => {
  it("normaliza, elimina repetidos y descarta identificadores inválidos", () => {
    expect(
      parseModelKeys("openai/gpt-5, OPENAI/GPT-5, gemini-2.5-pro, modelo con espacios"),
    ).toEqual(["openai/gpt-5", "gemini-2.5-pro"]);
  });
});
