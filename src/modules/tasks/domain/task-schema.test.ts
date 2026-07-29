import { describe, expect, it } from "vitest";

import { taskFormSchema } from "@/modules/tasks/domain/task-schema";

describe("taskFormSchema", () => {
  it("accepts a complete task", () => {
    const result = taskFormSchema.safeParse({
      projectId: "11111111-1111-4111-8111-111111111111",
      title: "Implementar selector de variantes",
      description: "Crear el flujo principal.",
      acceptanceCriteria: "La variante elegida se conserva.",
      status: "backlog",
      priority: "high",
      progress: 0,
      dueDate: "",
      assignedAgentId: "",
      conversationId: "",
      sourceMessageId: "",
      createdByAgentId: "",
      dependencyIds: [],
    });
    expect(result.success).toBe(true);
  });
});
