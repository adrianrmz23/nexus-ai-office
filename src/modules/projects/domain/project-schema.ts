import { z } from "zod";

import {
  PROJECT_ICONS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from "@/modules/projects/domain/project";

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "La URL no puede superar 500 caracteres.")
  .refine(
    (value) => value.length === 0 || /^https?:\/\//i.test(value),
    "Utiliza una URL que comience con http:// o https://.",
  );

const budgetSchema = z
  .string()
  .trim()
  .max(20, "El presupuesto es demasiado extenso.")
  .refine(
    (value) => value.length === 0 || /^\d+(?:\.\d{1,2})?$/.test(value),
    "Utiliza un monto válido con máximo dos decimales.",
  )
  .refine(
    (value) => value.length === 0 || Number(value) <= 9_999_999_999.99,
    "El presupuesto supera el límite permitido.",
  );

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Escribe un nombre de al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  clientName: z
    .string()
    .trim()
    .max(120, "El cliente no puede superar 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(3000, "La descripción no puede superar 3000 caracteres."),
  icon: z.enum(PROJECT_ICONS),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Selecciona un color válido."),
  status: z.enum(PROJECT_STATUSES),
  priority: z.enum(PROJECT_PRIORITIES),
  repositoryUrl: optionalUrlSchema,
  productionUrl: optionalUrlSchema,
  stagingUrl: optionalUrlSchema,
  permanentInstructions: z
    .string()
    .trim()
    .max(10000, "Las instrucciones no pueden superar 10000 caracteres."),
  projectRules: z
    .string()
    .trim()
    .max(10000, "Las reglas no pueden superar 10000 caracteres."),
  conventions: z
    .string()
    .trim()
    .max(10000, "Las convenciones no pueden superar 10000 caracteres."),
  budgetAmount: budgetSchema,
  budgetCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Selecciona una moneda válida."),
  technologyIds: z
    .array(z.string().uuid("Tecnología no válida."))
    .max(30, "Un proyecto puede contener como máximo 30 tecnologías.")
    .refine(
      (technologyIds) => new Set(technologyIds).size === technologyIds.length,
      "La selección de tecnologías contiene elementos repetidos.",
    ),
});

export const projectIdSchema = z.string().uuid("Proyecto no válido.");

export type ProjectFormInput = z.infer<typeof projectFormSchema>;

export function parseProjectBudget(value: string): number | null {
  return value.length > 0 ? Number(value) : null;
}
