import {
  Braces,
  Boxes,
  CloudCog,
  Code2,
  Database,
  Gauge,
  Globe2,
  LayoutTemplate,
  Package,
  Palette,
  PlugZap,
  SearchCheck,
  ShoppingBag,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const TECHNOLOGY_CATEGORIES = [
  "language",
  "framework",
  "library",
  "cms",
  "ecommerce",
  "database",
  "infrastructure",
  "tool",
  "design",
  "analytics",
  "seo",
  "api",
  "other",
] as const;

export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];

export const TECHNOLOGY_STATUSES = ["active", "inactive", "archived"] as const;
export type TechnologyStatus = (typeof TECHNOLOGY_STATUSES)[number];

export const TECHNOLOGY_ICONS = [
  "code-2",
  "braces",
  "boxes",
  "database",
  "layout-template",
  "shopping-bag",
  "cloud-cog",
  "wrench",
  "palette",
  "gauge",
  "search-check",
  "plug-zap",
  "package",
  "globe-2",
] as const;

export type TechnologyIconName = (typeof TECHNOLOGY_ICONS)[number];

export const TECHNOLOGY_CATEGORY_LABELS: Record<TechnologyCategory, string> = {
  language: "Lenguaje",
  framework: "Framework",
  library: "Librería",
  cms: "CMS",
  ecommerce: "Ecommerce",
  database: "Base de datos",
  infrastructure: "Infraestructura",
  tool: "Herramienta",
  design: "Diseño",
  analytics: "Analítica",
  seo: "SEO",
  api: "API",
  other: "Otro",
};

export const TECHNOLOGY_STATUS_LABELS: Record<TechnologyStatus, string> = {
  active: "Activa",
  inactive: "Inactiva",
  archived: "Archivada",
};

export const TECHNOLOGY_ICON_LABELS: Record<TechnologyIconName, string> = {
  "code-2": "Código",
  braces: "Sintaxis",
  boxes: "Módulos",
  database: "Base de datos",
  "layout-template": "Interfaz",
  "shopping-bag": "Comercio",
  "cloud-cog": "Infraestructura",
  wrench: "Herramienta",
  palette: "Diseño",
  gauge: "Analítica",
  "search-check": "SEO",
  "plug-zap": "API e integración",
  package: "Paquete",
  "globe-2": "Web",
};

const TECHNOLOGY_ICON_COMPONENTS: Record<TechnologyIconName, LucideIcon> = {
  "code-2": Code2,
  braces: Braces,
  boxes: Boxes,
  database: Database,
  "layout-template": LayoutTemplate,
  "shopping-bag": ShoppingBag,
  "cloud-cog": CloudCog,
  wrench: Wrench,
  palette: Palette,
  gauge: Gauge,
  "search-check": SearchCheck,
  "plug-zap": PlugZap,
  package: Package,
  "globe-2": Globe2,
};

export function getTechnologyIcon(icon: string): LucideIcon {
  return (
    TECHNOLOGY_ICON_COMPONENTS[icon as TechnologyIconName] ??
    TECHNOLOGY_ICON_COMPONENTS["code-2"]
  );
}

export type TechnologyRecord = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  category: TechnologyCategory;
  description: string;
  icon: TechnologyIconName;
  color: string;
  version: string | null;
  official_docs_url: string | null;
  tags: string[];
  technical_prompt: string;
  status: TechnologyStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
