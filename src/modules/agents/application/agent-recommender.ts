import type {
  AgentRecord,
  AgentTechnologyRecord,
} from "@/modules/agents/domain/agent";

export type ProjectTechnologySignal = {
  id: string;
  name: string;
  category: string;
};

export type AgentRecommendation = {
  agent: AgentRecord;
  score: number;
  confidence: number;
  reasons: string[];
  matchingTechnologyIds: string[];
};

type RecommendAgentsInput = {
  agents: AgentRecord[];
  technologiesByAgent: Map<string, AgentTechnologyRecord[]>;
  projectTechnologies: ProjectTechnologySignal[];
  assignedAgentIds?: Set<string>;
  limit?: number;
};

const FRONTEND_PATTERN =
  /react|next|javascript|typescript|html|css|tailwind|vue|angular|svelte|frontend|vite/i;
const BACKEND_PATTERN =
  /node|php|laravel|python|java|ruby|golang|\bgo\b|sql|supabase|postgres|mysql|redis|api/i;
const COMMERCE_PATTERN =
  /shopify|liquid|wordpress|woocommerce|elementor|ecommerce|storefront|checkout/i;
const DESIGN_PATTERN = /figma|design|ui|ux|css|tailwind|elementor|frontend/i;

function matchesPattern(
  technologies: ProjectTechnologySignal[],
  pattern: RegExp,
): boolean {
  return technologies.some((technology) =>
    pattern.test(`${technology.name} ${technology.category}`),
  );
}

function roleBonus(
  agent: AgentRecord,
  projectTechnologies: ProjectTechnologySignal[],
): { bonus: number; reason?: string } {
  const hasFrontend = matchesPattern(projectTechnologies, FRONTEND_PATTERN);
  const hasBackend = matchesPattern(projectTechnologies, BACKEND_PATTERN);
  const hasCommerce = matchesPattern(projectTechnologies, COMMERCE_PATTERN);
  const hasDesign = matchesPattern(projectTechnologies, DESIGN_PATTERN);

  switch (agent.role) {
    case "orchestrator":
      return { bonus: 95, reason: "Coordina el trabajo del equipo" };
    case "debugging":
      return { bonus: 58, reason: "Aporta diagnóstico y causa raíz" };
    case "architecture":
      return { bonus: 54, reason: "Protege las decisiones técnicas" };
    case "qa":
      return { bonus: 50, reason: "Valida cambios y evita regresiones" };
    case "frontend":
      return hasFrontend
        ? { bonus: 88, reason: "El stack requiere experiencia frontend" }
        : { bonus: 18 };
    case "backend":
      return hasBackend
        ? { bonus: 88, reason: "El stack incluye backend, datos o APIs" }
        : { bonus: 18 };
    case "commerce":
      return hasCommerce
        ? { bonus: 94, reason: "El proyecto utiliza CMS o ecommerce" }
        : { bonus: 8 };
    case "design":
      return hasDesign || hasFrontend
        ? { bonus: 68, reason: "Puede revisar la experiencia visual" }
        : { bonus: 12 };
    case "custom":
      return { bonus: 10 };
  }
}

export function recommendProjectAgents({
  agents,
  technologiesByAgent,
  projectTechnologies,
  assignedAgentIds = new Set<string>(),
  limit = 6,
}: RecommendAgentsInput): AgentRecommendation[] {
  const projectTechnologyIds = new Set(
    projectTechnologies.map((technology) => technology.id),
  );

  const recommendations = agents
    .filter(
      (agent) =>
        agent.status === "active" && !assignedAgentIds.has(agent.id),
    )
    .map((agent) => {
      const expertise = technologiesByAgent.get(agent.id) ?? [];
      const matchingExpertise = expertise.filter((item) =>
        projectTechnologyIds.has(item.technology_id),
      );
      const role = roleBonus(agent, projectTechnologies);
      const expertiseScore = matchingExpertise.reduce(
        (total, item) => total + item.proficiency * 7 + (item.is_primary ? 8 : 0),
        0,
      );
      const reasons: string[] = [];

      if (role.reason) {
        reasons.push(role.reason);
      }

      if (matchingExpertise.length > 0) {
        reasons.push(
          `Coincide con ${matchingExpertise.length} ${
            matchingExpertise.length === 1 ? "tecnología" : "tecnologías"
          } del proyecto`,
        );
      }

      if (agent.memory_enabled) {
        reasons.push("Puede conservar memoria especializada");
      }

      const score = role.bonus + expertiseScore + (agent.memory_enabled ? 3 : 0);

      return {
        agent,
        score,
        confidence: Math.min(98, Math.max(45, Math.round(48 + score / 2.2))),
        reasons: reasons.slice(0, 3),
        matchingTechnologyIds: matchingExpertise.map(
          (item) => item.technology_id,
        ),
      };
    })
    .filter(
      (recommendation) =>
        recommendation.score >= 45 ||
        recommendation.matchingTechnologyIds.length > 0,
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.agent.name.localeCompare(right.agent.name, "es-MX");
    });

  const selected: AgentRecommendation[] = [];
  const selectedRoles = new Set<string>();

  for (const recommendation of recommendations) {
    if (selected.length >= limit) {
      break;
    }

    if (
      recommendation.agent.role === "orchestrator" ||
      !selectedRoles.has(recommendation.agent.role) ||
      recommendation.matchingTechnologyIds.length > 0
    ) {
      selected.push(recommendation);
      selectedRoles.add(recommendation.agent.role);
    }
  }

  if (selected.length < Math.min(limit, recommendations.length)) {
    for (const recommendation of recommendations) {
      if (selected.length >= limit) {
        break;
      }

      if (!selected.some((item) => item.agent.id === recommendation.agent.id)) {
        selected.push(recommendation);
      }
    }
  }

  return selected;
}
