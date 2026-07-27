import { z } from "zod";

import {
  AGENT_ICONS,
  AGENT_ROLES,
  AGENT_SCOPES,
  AGENT_STATUSES,
  AGENT_TOOLS,
} from "@/modules/agents/domain/agent";

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "La URL no puede superar 500 caracteres.")
  .refine(
    (value: string) => value.length === 0 || /^https?:\/\//i.test(value),
    "Utiliza una URL que comience con http:// o https://.",
  );

const optionalModelKeySchema = z
  .string()
  .trim()
  .max(150, "El identificador del modelo no puede superar 150 caracteres.")
  .refine(
    (value: string) => value.length === 0 || /^[a-zA-Z0-9._:/-]+$/.test(value),
    "Utiliza un identificador de modelo válido.",
  );

export const agentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe un nombre de al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres."),
  description: z
    .string()
    .trim()
    .max(1800, "La descripción no puede superar 1800 caracteres."),
  role: z.enum(AGENT_ROLES),
  scope: z.enum(AGENT_SCOPES),
  icon: z.enum(AGENT_ICONS),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Selecciona un color válido."),
  avatarUrl: optionalUrlSchema,
  instructions: z
    .string()
    .trim()
    .min(20, "Agrega instrucciones de al menos 20 caracteres.")
    .max(15000, "Las instrucciones no pueden superar 15000 caracteres."),
  preferredModelKey: optionalModelKeySchema,
  alternativeModelKeys: z
    .string()
    .trim()
    .max(800, "Los modelos alternativos son demasiado extensos."),
  creativity: z.coerce
    .number()
    .int("El nivel de creatividad debe ser un número entero.")
    .min(0, "La creatividad mínima es 0.")
    .max(100, "La creatividad máxima es 100."),
  memoryEnabled: z.boolean(),
  allowedTools: z
    .array(z.enum(AGENT_TOOLS))
    .max(AGENT_TOOLS.length, "La selección de herramientas no es válida.")
    .refine(
      (tools: string[]) => new Set(tools).size === tools.length,
      "La selección contiene herramientas repetidas.",
    ),
  escalationRules: z
    .string()
    .trim()
    .max(5000, "Las reglas de escalamiento no pueden superar 5000 caracteres."),
  status: z.enum(AGENT_STATUSES),
  technologyIds: z
    .array(z.string().uuid("Tecnología no válida."))
    .max(30, "Un agente puede dominar como máximo 30 tecnologías.")
    .refine(
      (technologyIds: string[]) =>
        new Set(technologyIds).size === technologyIds.length,
      "La selección de tecnologías contiene elementos repetidos.",
    ),
  collaboratorIds: z
    .array(z.string().uuid("Agente colaborador no válido."))
    .max(20, "Un agente puede tener como máximo 20 colaboradores directos.")
    .refine(
      (collaboratorIds: string[]) =>
        new Set(collaboratorIds).size === collaboratorIds.length,
      "La selección de colaboradores contiene elementos repetidos.",
    ),
});

export const agentIdSchema = z.string().uuid("Agente no válido.");
export const projectAgentIdSchema = z.string().uuid("Proyecto no válido.");

export type AgentFormInput = z.infer<typeof agentFormSchema>;

export function parseModelKeys(value: string): string[] {
  const uniqueValues = new Map<string, string>();

  for (const rawValue of value.split(",")) {
    const modelKey = rawValue.trim().slice(0, 150);

    if (!modelKey || !/^[a-zA-Z0-9._:/-]+$/.test(modelKey)) {
      continue;
    }

    const normalized = modelKey.toLowerCase();
    if (!uniqueValues.has(normalized)) {
      uniqueValues.set(normalized, modelKey);
    }
  }

  return Array.from(uniqueValues.values()).slice(0, 5);
}
