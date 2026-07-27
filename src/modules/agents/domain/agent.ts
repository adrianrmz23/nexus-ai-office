import {
  Blocks,
  Bot,
  Bug,
  Code2,
  Database,
  Network,
  Palette,
  Search,
  ServerCog,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const AGENT_ROLES = [
  "orchestrator",
  "design",
  "frontend",
  "backend",
  "commerce",
  "debugging",
  "architecture",
  "qa",
  "custom",
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export const AGENT_STATUSES = ["active", "inactive", "archived"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_SCOPES = ["global", "project"] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

export const AGENT_KINDS = ["system", "custom"] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];

export const AGENT_ICONS = [
  "network",
  "palette",
  "code-2",
  "server-cog",
  "shopping-bag",
  "bug",
  "blocks-3",
  "shield-check",
  "bot",
  "sparkles",
  "database",
  "search-code",
] as const;

export type AgentIconName = (typeof AGENT_ICONS)[number];

export const AGENT_TOOLS = [
  "search_project_files",
  "read_files",
  "create_artifacts",
  "consult_memory",
  "save_memory",
  "analyze_errors",
  "compare_versions",
  "search_documentation",
  "query_database",
  "generate_sql",
  "analyze_images",
  "create_tasks",
  "handoff_task",
  "request_review",
  "register_decision",
] as const;

export type AgentTool = (typeof AGENT_TOOLS)[number];

export const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  orchestrator: "Orquestador",
  design: "Diseño UI/UX",
  frontend: "Frontend",
  backend: "Backend",
  commerce: "CMS y ecommerce",
  debugging: "Debugging",
  architecture: "Arquitectura",
  qa: "QA",
  custom: "Personalizado",
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};

export const AGENT_SCOPE_LABELS: Record<AgentScope, string> = {
  global: "Disponible para toda la oficina",
  project: "Solo mediante asignación a proyecto",
};

export const AGENT_ICON_LABELS: Record<AgentIconName, string> = {
  network: "Red y coordinación",
  palette: "Diseño",
  "code-2": "Código",
  "server-cog": "Backend",
  "shopping-bag": "Comercio",
  bug: "Debugging",
  "blocks-3": "Arquitectura",
  "shield-check": "Calidad",
  bot: "Agente",
  sparkles: "Creatividad",
  database: "Datos",
  "search-code": "Revisión técnica",
};

export const AGENT_TOOL_LABELS: Record<AgentTool, string> = {
  search_project_files: "Buscar archivos del proyecto",
  read_files: "Leer archivos",
  create_artifacts: "Crear artefactos",
  consult_memory: "Consultar memoria",
  save_memory: "Guardar memoria",
  analyze_errors: "Analizar errores",
  compare_versions: "Comparar versiones",
  search_documentation: "Buscar documentación",
  query_database: "Consultar base de datos",
  generate_sql: "Generar SQL",
  analyze_images: "Analizar imágenes",
  create_tasks: "Crear tareas",
  handoff_task: "Transferir tareas",
  request_review: "Solicitar revisión",
  register_decision: "Registrar decisiones",
};

const AGENT_ICON_COMPONENTS: Record<AgentIconName, LucideIcon> = {
  network: Network,
  palette: Palette,
  "code-2": Code2,
  "server-cog": ServerCog,
  "shopping-bag": ShoppingBag,
  bug: Bug,
  "blocks-3": Blocks,
  "shield-check": ShieldCheck,
  bot: Bot,
  sparkles: Sparkles,
  database: Database,
  "search-code": Search,
};

export function getAgentIcon(icon: string): LucideIcon {
  return (
    AGENT_ICON_COMPONENTS[icon as AgentIconName] ??
    AGENT_ICON_COMPONENTS.bot
  );
}

export type AgentRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string;
  role: AgentRole;
  agent_kind: AgentKind;
  scope: AgentScope;
  icon: AgentIconName;
  color: string;
  avatar_url: string | null;
  instructions: string;
  preferred_model_key: string | null;
  alternative_model_keys: string[];
  creativity: number;
  memory_enabled: boolean;
  allowed_tools: AgentTool[];
  escalation_rules: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type AgentTechnologyRecord = {
  agent_id: string;
  technology_id: string;
  proficiency: number;
  is_primary: boolean;
  technology: {
    id: string;
    name: string;
    category: string;
    color: string;
    icon: string;
    version: string | null;
    status: "active" | "inactive" | "archived";
  };
};

export type ProjectAgentRecord = {
  project_id: string;
  agent_id: string;
  is_lead: boolean;
  status: "active" | "inactive";
  assignment_reason: string;
  assigned_at: string;
  agent: AgentRecord;
};

export type AgentCollaboratorRecord = {
  source_agent_id: string;
  target_agent_id: string;
  target_agent: Pick<
    AgentRecord,
    "id" | "name" | "role" | "icon" | "color" | "status"
  >;
};
