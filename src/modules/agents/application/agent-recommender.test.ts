import { describe, expect, it } from "vitest";

import { recommendProjectAgents } from "@/modules/agents/application/agent-recommender";
import type {
  AgentRecord,
  AgentTechnologyRecord,
} from "@/modules/agents/domain/agent";

function agent(
  id: string,
  role: AgentRecord["role"],
  name: string,
): AgentRecord {
  return {
    id,
    workspace_id: "workspace",
    name,
    slug: name.toLowerCase(),
    description: "",
    role,
    agent_kind: "system",
    scope: "global",
    icon: "bot",
    color: "#55e6c1",
    avatar_url: null,
    instructions: "Instrucciones suficientemente extensas para el agente.",
    preferred_model_key: null,
    alternative_model_keys: [],
    creativity: 20,
    memory_enabled: true,
    allowed_tools: [],
    escalation_rules: "",
    status: "active",
    created_at: "2026-07-26T00:00:00Z",
    updated_at: "2026-07-26T00:00:00Z",
    archived_at: null,
  };
}

describe("recommendProjectAgents", () => {
  it("prioriza orquestación y comercio para un proyecto Shopify", () => {
    const orchestrator = agent("00000000-0000-4000-8000-000000000001", "orchestrator", "Nexus");
    const commerce = agent("00000000-0000-4000-8000-000000000002", "commerce", "Commerce");
    const frontend = agent("00000000-0000-4000-8000-000000000003", "frontend", "Frontend");
    const technologyId = "00000000-0000-4000-8000-000000000010";
    const expertise = new Map<string, AgentTechnologyRecord[]>([
      [
        commerce.id,
        [
          {
            agent_id: commerce.id,
            technology_id: technologyId,
            proficiency: 5,
            is_primary: true,
            technology: {
              id: technologyId,
              name: "Shopify",
              category: "ecommerce",
              color: "#55e6c1",
              icon: "shopping-bag",
              version: null,
              status: "active",
            },
          },
        ],
      ],
    ]);

    const result = recommendProjectAgents({
      agents: [frontend, commerce, orchestrator],
      technologiesByAgent: expertise,
      projectTechnologies: [
        { id: technologyId, name: "Shopify", category: "ecommerce" },
      ],
    });

    expect(result[0]?.agent.role).toBe("commerce");
    expect(result.some((item) => item.agent.role === "orchestrator")).toBe(true);
  });

  it("excluye agentes ya asignados", () => {
    const orchestrator = agent("00000000-0000-4000-8000-000000000001", "orchestrator", "Nexus");

    const result = recommendProjectAgents({
      agents: [orchestrator],
      technologiesByAgent: new Map(),
      projectTechnologies: [],
      assignedAgentIds: new Set([orchestrator.id]),
    });

    expect(result).toEqual([]);
  });
});
