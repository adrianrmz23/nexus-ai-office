import {
  Code2,
  Database,
  FolderKanban,
  Globe2,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PROJECT_ICONS = [
  "folder-kanban",
  "rocket",
  "shopping-bag",
  "globe-2",
  "code-2",
  "database",
  "shield-check",
  "sparkles",
] as const;

export type ProjectIconName = (typeof PROJECT_ICONS)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planeación",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  archived: "Archivado",
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const PROJECT_ICON_LABELS: Record<ProjectIconName, string> = {
  "folder-kanban": "Proyecto",
  rocket: "Lanzamiento",
  "shopping-bag": "Comercio",
  "globe-2": "Sitio web",
  "code-2": "Desarrollo",
  database: "Datos",
  "shield-check": "Seguridad",
  sparkles: "Innovación",
};

const PROJECT_ICON_COMPONENTS: Record<ProjectIconName, LucideIcon> = {
  "folder-kanban": FolderKanban,
  rocket: Rocket,
  "shopping-bag": ShoppingBag,
  "globe-2": Globe2,
  "code-2": Code2,
  database: Database,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
};

export function getProjectIcon(icon: string): LucideIcon {
  return (
    PROJECT_ICON_COMPONENTS[icon as ProjectIconName] ??
    PROJECT_ICON_COMPONENTS["folder-kanban"]
  );
}

export type ProjectRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  client_name: string | null;
  description: string;
  icon: ProjectIconName;
  color: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  repository_url: string | null;
  production_url: string | null;
  staging_url: string | null;
  permanent_instructions: string;
  project_rules: string;
  conventions: string;
  budget_amount: number | null;
  budget_currency: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type ProjectTechnologyRecord = {
  project_id: string;
  technology_id: string;
  technology: {
    id: string;
    name: string;
    color: string;
    icon: string;
    version: string | null;
    status: "active" | "inactive" | "archived";
  };
};
