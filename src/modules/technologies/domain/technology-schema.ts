import { z } from "zod";

import {
  TECHNOLOGY_CATEGORIES,
  TECHNOLOGY_ICONS,
  TECHNOLOGY_STATUSES,
} from "@/modules/technologies/domain/technology";

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "La URL no puede superar 500 caracteres.")
  .refine(
    (value) => value.length === 0 || /^https?:\/\//i.test(value),
    "Utiliza una URL que comience con http:// o https://.",
  );

export const technologyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de la tecnología.")
    .max(80, "El nombre no puede superar 80 caracteres."),
  category: z.enum(TECHNOLOGY_CATEGORIES),
  description: z
    .string()
    .trim()
    .max(1200, "La descripción no puede superar 1200 caracteres."),
  icon: z.enum(TECHNOLOGY_ICONS),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Selecciona un color válido."),
  version: z
    .string()
    .trim()
    .max(40, "La versión no puede superar 40 caracteres."),
  officialDocsUrl: optionalUrlSchema,
  tags: z
    .string()
    .trim()
    .max(400, "Las etiquetas son demasiado extensas."),
  technicalPrompt: z
    .string()
    .trim()
    .max(5000, "El prompt técnico no puede superar 5000 caracteres."),
  status: z.enum(TECHNOLOGY_STATUSES),
});

export const technologyIdSchema = z.string().uuid("Tecnología no válida.");

export type TechnologyFormInput = z.infer<typeof technologyFormSchema>;

export function parseTechnologyTags(value: string): string[] {
  const uniqueTags = new Map<string, string>();

  for (const rawTag of value.split(",")) {
    const tag = rawTag.trim().replace(/\s+/g, " ").slice(0, 30);

    if (!tag) {
      continue;
    }

    const normalized = tag.toLocaleLowerCase("es-MX");
    if (!uniqueTags.has(normalized)) {
      uniqueTags.set(normalized, tag);
    }
  }

  return Array.from(uniqueTags.values()).slice(0, 12);
}
