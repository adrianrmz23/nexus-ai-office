import { describe, expect, it } from "vitest";

import {
  buildFallbackTeamPlan,
  detectRequestedRoles,
  hardenTeamExecutionPlan,
  parseTeamExecutionPlan,
} from "@/modules/orchestration/domain/team-plan";

const agents = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Leader",
    role: "orchestrator" as const,
    isLead: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Forge Frontend",
    role: "frontend" as const,
    isLead: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Sentinel QA",
    role: "qa" as const,
    isLead: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Astra UI",
    role: "design" as const,
    isLead: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Trace Debugger",
    role: "debugging" as const,
    isLead: false,
  },
];

describe("team plan", () => {
  it("accepts only assigned non-leader agents", () => {
    const plan = parseTeamExecutionPlan({
      raw: JSON.stringify({
        summary: "Plan",
        steps: [
          {
            agentId: agents[1]?.id,
            objective: "Implementar",
            reason: "Frontend",
            expectedOutput: "Código",
          },
          { agentId: agents[0]?.id, objective: "No válido" },
          {
            agentId: "00000000-0000-4000-8000-000000000099",
            objective: "No asignado",
          },
        ],
      }),
      agents,
      maximumSteps: 3,
    });

    expect(plan?.steps).toHaveLength(1);
    expect(plan?.steps[0]?.agentId).toBe(agents[1]?.id);
  });

  it("prioritizes explicit QA, design and frontend objectives", () => {
    const roles = detectRequestedRoles({
      taskType: "coding",
      maximumSteps: 3,
      userRequest:
        "Propón dirección visual, estructura frontend y componentes, riesgos técnicos y criterios de validación y QA.",
    });

    expect(roles).toEqual(["qa", "design", "frontend"]);
  });

  it("replaces a generic debugging step when QA was explicitly requested", () => {
    const hardened = hardenTeamExecutionPlan({
      taskType: "coding",
      maximumSteps: 3,
      agents,
      userRequest:
        "Necesito dirección visual, estructura frontend y criterios de validación y QA.",
      plan: {
        generatedBy: "orchestrator",
        summary: "Plan original",
        steps: [
          {
            agentId: agents[4]?.id ?? "",
            objective: "Revisar riesgos",
            reason: "Riesgos",
            expectedOutput: "Lista de riesgos",
          },
          {
            agentId: agents[1]?.id ?? "",
            objective: "Definir componentes",
            reason: "Frontend",
            expectedOutput: "Componentes",
          },
          {
            agentId: agents[3]?.id ?? "",
            objective: "Diseñar interfaz",
            reason: "Diseño",
            expectedOutput: "UI",
          },
        ],
      },
    });

    const selectedNames = hardened.steps.map(
      (step) => agents.find((agent) => agent.id === step.agentId)?.name,
    );
    expect(selectedNames).toEqual(["Sentinel QA", "Astra UI", "Forge Frontend"]);
  });

  it("creates a deterministic role-aware fallback", () => {
    const plan = buildFallbackTeamPlan({
      taskType: "coding",
      agents,
      maximumSteps: 2,
      userRequest: "Crear una pantalla",
    });

    expect(plan.generatedBy).toBe("fallback");
    expect(plan.steps[0]?.agentId).toBe(agents[1]?.id);
    expect(plan.steps).toHaveLength(2);
  });
});
