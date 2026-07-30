import { REPOSITORY_TOOLS } from "@/core/tools/repository-tools";
import { WORK_MANAGEMENT_TOOLS } from "@/core/tools/work-management-tools";

export const NEXUS_TOOLS = [
  ...WORK_MANAGEMENT_TOOLS,
  ...REPOSITORY_TOOLS,
] as const;

export type NexusToolName = (typeof NEXUS_TOOLS)[number]["name"];

export function getNexusTool(name: string) {
  return NEXUS_TOOLS.find((tool) => tool.name === name) ?? null;
}

export function listNexusToolMetadata() {
  return NEXUS_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    requiresHumanConfirmation: tool.requiresHumanConfirmation,
  }));
}
