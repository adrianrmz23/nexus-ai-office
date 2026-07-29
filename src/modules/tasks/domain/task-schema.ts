import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/modules/tasks/domain/task";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).transform((value: string) => value || null);

export const taskIdSchema = z.string().uuid("La tarea seleccionada no es válida.");

export const taskFormSchema = z.object({
  projectId: z.string().uuid("Selecciona un proyecto válido."),
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres.").max(180),
  description: z.string().trim().max(20_000),
  acceptanceCriteria: z.string().trim().max(12_000),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  progress: z.coerce.number().int().min(0).max(100),
  dueDate: z.union([z.literal(""), z.string().date()]).transform((value: string) => value || null),
  assignedAgentId: optionalUuid,
  conversationId: optionalUuid,
  sourceMessageId: optionalUuid,
  createdByAgentId: optionalUuid,
  dependencyIds: z.array(z.string().uuid()).max(20),
});

export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskFormInput = z.infer<typeof taskFormSchema>;
