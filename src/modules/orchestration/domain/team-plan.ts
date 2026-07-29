import type { AgentRole } from "@/modules/agents/domain/agent";
import type { ModelTaskType } from "@/modules/models/domain/model";

export type TeamPlanningAgent = {
  id: string;
  name: string;
  role: AgentRole;
  isLead: boolean;
};

export type TeamPlanStep = {
  agentId: string;
  objective: string;
  reason: string;
  expectedOutput: string;
};

export type TeamExecutionPlan = {
  summary: string;
  steps: TeamPlanStep[];
  generatedBy: "orchestrator" | "fallback";
};

const ROLE_PRIORITY: Record<ModelTaskType, AgentRole[]> = {
  general: ["architecture", "qa", "debugging", "frontend", "backend", "design", "commerce"],
  coding: ["frontend", "backend", "commerce", "qa", "debugging", "architecture", "design"],
  debugging: ["debugging", "qa", "frontend", "backend", "architecture"],
  sql: ["backend", "architecture", "qa", "debugging"],
  design: ["design", "frontend", "qa", "architecture"],
  architecture: ["architecture", "backend", "frontend", "qa", "debugging"],
  qa: ["qa", "debugging", "frontend", "backend", "architecture"],
  analysis: ["architecture", "qa", "debugging", "backend", "frontend"],
  content: ["design", "commerce", "qa", "frontend", "architecture"],
};

const EXPLICIT_ROLE_SCORE: Partial<Record<AgentRole, number>> = {
  qa: 120,
  design: 110,
  frontend: 105,
  architecture: 100,
  backend: 95,
  commerce: 92,
  debugging: 85,
};

const ROLE_KEYWORDS: Partial<Record<AgentRole, RegExp[]>> = {
  design: [
    /\b(ui|ux)\b/i,
    /diseñ[oa]/i,
    /visual/i,
    /interfaz/i,
    /jerarqu[ií]a visual/i,
    /responsive/i,
    /experiencia de usuario/i,
  ],
  frontend: [
    /front[- ]?end/i,
    /componentes?/i,
    /react/i,
    /next\.?js/i,
    /tailwind/i,
    /maquet/i,
    /p[aá]gina/i,
  ],
  backend: [
    /back[- ]?end/i,
    /api\b/i,
    /base de datos/i,
    /supabase/i,
    /postgres/i,
    /servidor/i,
    /autenticaci[oó]n/i,
  ],
  commerce: [
    /shopify/i,
    /liquid/i,
    /woocommerce/i,
    /wordpress/i,
    /ecommerce/i,
    /comercio electr[oó]nico/i,
  ],
  debugging: [
    /debug/i,
    /error(?:es)?/i,
    /fall[ao]s?/i,
    /logs?/i,
    /causa ra[ií]z/i,
    /regresi[oó]n t[eé]cnica/i,
  ],
  architecture: [
    /arquitectura/i,
    /escalabilidad/i,
    /integraci[oó]n/i,
    /dependencias?/i,
    /m[oó]dulos?/i,
    /decisi[oó]n t[eé]cnica/i,
  ],
  qa: [
    /\bqa\b/i,
    /calidad/i,
    /pruebas?/i,
    /test(?:s|ing)?\b/i,
    /validaci[oó]n/i,
    /criterios? de aceptaci[oó]n/i,
    /compatibilidad/i,
    /accesibilidad/i,
  ],
};

const ROLE_OBJECTIVE: Partial<Record<AgentRole, (request: string) => TeamPlanStep>> = {
  design: () => ({
    agentId: "",
    objective: "Definir una dirección UI/UX original, usable y coherente con el producto.",
    reason: "La solicitud requiere decisiones visuales y de experiencia de usuario.",
    expectedOutput:
      "Dirección visual, jerarquía, estructura de interfaz, estados responsive y criterios de accesibilidad.",
  }),
  frontend: () => ({
    agentId: "",
    objective: "Definir la estructura frontend y los componentes necesarios para implementar la solución.",
    reason: "La solicitud incluye implementación o arquitectura de interfaz.",
    expectedOutput:
      "Componentes, responsabilidades, flujo de datos, estados, riesgos de implementación y pasos verificables.",
  }),
  backend: () => ({
    agentId: "",
    objective: "Evaluar la lógica de servidor, datos, permisos e integraciones necesarias.",
    reason: "La solicitud involucra persistencia, APIs o comportamiento de backend.",
    expectedOutput:
      "Diseño de datos o API, validaciones, seguridad, errores esperados y estrategia de prueba.",
  }),
  commerce: () => ({
    agentId: "",
    objective: "Adaptar la propuesta a las restricciones y capacidades reales de la plataforma de comercio.",
    reason: "La solicitud contiene requisitos de Shopify, Liquid, CMS o ecommerce.",
    expectedOutput:
      "Estructura específica de plataforma, extensiones posibles, restricciones y validación de catálogo o checkout.",
  }),
  debugging: () => ({
    agentId: "",
    objective: "Identificar modos de fallo, causas probables y puntos concretos de diagnóstico.",
    reason: "La solicitud requiere análisis de errores o riesgos técnicos verificables.",
    expectedOutput:
      "Hipótesis de causa raíz, evidencia requerida, efectos secundarios y plan de reproducción y validación.",
  }),
  architecture: () => ({
    agentId: "",
    objective: "Evaluar módulos, dependencias, integraciones y riesgos arquitectónicos de la propuesta.",
    reason: "La solicitud requiere una decisión técnica transversal o de escalabilidad.",
    expectedOutput:
      "Límites de módulos, contratos, dependencias, riesgos, ADR sugerido y estrategia de evolución.",
  }),
  qa: () => ({
    agentId: "",
    objective:
      "Definir criterios de aceptación, riesgos de regresión y un plan de validación funcional, visual y técnico.",
    reason: "La solicitud menciona pruebas, QA, validación o calidad del resultado.",
    expectedOutput:
      "Casos de prueba, criterios de aceptación, escenarios límite, accesibilidad, responsive y regresiones a vigilar.",
  }),
};

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function extractJsonObject(value: string): unknown {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
    } catch {
      return null;
    }
  }
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function roleRequested(role: AgentRole, request: string): boolean {
  return (ROLE_KEYWORDS[role] ?? []).some((pattern) => pattern.test(request));
}

export function detectRequestedRoles(input: {
  userRequest: string;
  taskType: ModelTaskType;
  maximumSteps: number;
}): AgentRole[] {
  const explicitlyRequested = Object.keys(ROLE_KEYWORDS)
    .map((role) => role as AgentRole)
    .filter((role) => roleRequested(role, input.userRequest))
    .sort((left, right) => {
      const scoreDelta = (EXPLICIT_ROLE_SCORE[right] ?? 0) - (EXPLICIT_ROLE_SCORE[left] ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return ROLE_PRIORITY[input.taskType].indexOf(left) - ROLE_PRIORITY[input.taskType].indexOf(right);
    });

  const selected: AgentRole[] = [];
  for (const role of explicitlyRequested) {
    if (!selected.includes(role)) selected.push(role);
    if (selected.length >= input.maximumSteps) return selected;
  }

  for (const role of ROLE_PRIORITY[input.taskType]) {
    if (!selected.includes(role)) selected.push(role);
    if (selected.length >= input.maximumSteps) break;
  }

  return selected;
}

export function parseTeamExecutionPlan(input: {
  raw: string;
  agents: TeamPlanningAgent[];
  maximumSteps: number;
}): TeamExecutionPlan | null {
  const parsed = recordOf(extractJsonObject(input.raw));
  const summary = cleanText(parsed.summary, 1200);
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const allowedAgents = new Map(
    input.agents.filter((agent) => !agent.isLead).map((agent) => [agent.id, agent]),
  );
  const seen = new Set<string>();
  const steps: TeamPlanStep[] = [];

  for (const value of rawSteps) {
    if (steps.length >= input.maximumSteps) break;
    const step = recordOf(value);
    const agentId = cleanText(step.agentId, 80);
    if (!agentId || seen.has(agentId) || !allowedAgents.has(agentId)) continue;
    const objective = cleanText(step.objective, 1800);
    if (!objective) continue;

    seen.add(agentId);
    steps.push({
      agentId,
      objective,
      reason:
        cleanText(step.reason, 1200) ||
        `Se requiere la especialidad de ${allowedAgents.get(agentId)?.name ?? "este agente"}.`,
      expectedOutput:
        cleanText(step.expectedOutput, 1200) ||
        "Hallazgos verificables, propuesta concreta, riesgos y pasos de validación.",
    });
  }

  if (!steps.length) return null;
  return {
    summary: summary || "El líder dividió la solicitud entre especialistas complementarios.",
    steps,
    generatedBy: "orchestrator",
  };
}

function deterministicStep(agent: TeamPlanningAgent, userRequest: string): TeamPlanStep {
  const template = ROLE_OBJECTIVE[agent.role]?.(userRequest) ?? {
    agentId: "",
    objective: `Analizar la solicitud desde la especialidad ${agent.role}.`,
    reason: `El rol ${agent.role} aporta una perspectiva necesaria para la tarea.`,
    expectedOutput: "Conclusiones accionables, riesgos, supuestos y validación recomendada.",
  };
  return { ...template, agentId: agent.id };
}

export function hardenTeamExecutionPlan(input: {
  plan: TeamExecutionPlan;
  taskType: ModelTaskType;
  agents: TeamPlanningAgent[];
  maximumSteps: number;
  userRequest: string;
}): TeamExecutionPlan {
  const available = input.agents.filter((agent) => !agent.isLead);
  const agentById = new Map(available.map((agent) => [agent.id, agent]));
  const agentsByRole = new Map<AgentRole, TeamPlanningAgent[]>();
  for (const agent of available) {
    const current = agentsByRole.get(agent.role) ?? [];
    current.push(agent);
    agentsByRole.set(agent.role, current);
  }

  const preferredRoles = detectRequestedRoles({
    userRequest: input.userRequest,
    taskType: input.taskType,
    maximumSteps: input.maximumSteps,
  });
  const selectedIds = new Set<string>();
  const hardenedSteps: TeamPlanStep[] = [];

  const appendForRole = (role: AgentRole) => {
    if (hardenedSteps.length >= input.maximumSteps) return;
    const planStep = input.plan.steps.find((step) => {
      const agent = agentById.get(step.agentId);
      return agent?.role === role && !selectedIds.has(step.agentId);
    });
    if (planStep) {
      selectedIds.add(planStep.agentId);
      hardenedSteps.push(planStep);
      return;
    }

    const agent = (agentsByRole.get(role) ?? []).find((item) => !selectedIds.has(item.id));
    if (!agent) return;
    selectedIds.add(agent.id);
    hardenedSteps.push(deterministicStep(agent, input.userRequest));
  };

  for (const role of preferredRoles) appendForRole(role);

  for (const step of input.plan.steps) {
    if (hardenedSteps.length >= input.maximumSteps) break;
    if (selectedIds.has(step.agentId) || !agentById.has(step.agentId)) continue;
    selectedIds.add(step.agentId);
    hardenedSteps.push(step);
  }

  for (const role of ROLE_PRIORITY[input.taskType]) appendForRole(role);

  return {
    ...input.plan,
    summary:
      hardenedSteps.length === input.plan.steps.length &&
      hardenedSteps.every((step, index) => step.agentId === input.plan.steps[index]?.agentId)
        ? input.plan.summary
        : `${input.plan.summary} NEXUS ajustó la selección para cubrir explícitamente los objetivos solicitados con especialistas disponibles.`,
    steps: hardenedSteps.slice(0, input.maximumSteps),
  };
}

export function buildFallbackTeamPlan(input: {
  taskType: ModelTaskType;
  agents: TeamPlanningAgent[];
  maximumSteps: number;
  userRequest: string;
}): TeamExecutionPlan {
  const available = input.agents.filter((agent) => !agent.isLead);
  const preferredRoles = detectRequestedRoles({
    userRequest: input.userRequest,
    taskType: input.taskType,
    maximumSteps: input.maximumSteps,
  });
  const selected: TeamPlanningAgent[] = [];

  for (const role of preferredRoles) {
    const match = available.find(
      (agent) => agent.role === role && !selected.some((item) => item.id === agent.id),
    );
    if (match) selected.push(match);
    if (selected.length >= input.maximumSteps) break;
  }

  if (selected.length < input.maximumSteps) {
    const priority = ROLE_PRIORITY[input.taskType];
    const ordered = [...available].sort((left, right) => {
      const leftIndex = priority.indexOf(left.role);
      const rightIndex = priority.indexOf(right.role);
      const normalizedLeft = leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight || left.name.localeCompare(right.name);
    });
    for (const agent of ordered) {
      if (!selected.some((item) => item.id === agent.id)) selected.push(agent);
      if (selected.length >= input.maximumSteps) break;
    }
  }

  return {
    summary:
      "NEXUS aplicó un plan determinista y orientado a cobertura porque el plan del orquestador no pudo validarse.",
    generatedBy: "fallback",
    steps: selected.map((agent) => deterministicStep(agent, input.userRequest)),
  };
}

export function summarizeAgentOutput(value: string, maximum = 360): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}
