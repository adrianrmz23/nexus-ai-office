import { describe, expect, it } from "vitest";

import {
  parseProjectBudget,
  projectFormSchema,
} from "@/modules/projects/domain/project-schema";

const validProject = {
  name: "Tienda Shopify Integro",
  clientName: "Integro",
  description: "Proyecto de comercio electrónico.",
  icon: "shopping-bag" as const,
  color: "#55e6c1",
  status: "active" as const,
  priority: "high" as const,
  repositoryUrl: "https://github.com/example/project",
  productionUrl: "https://example.com",
  stagingUrl: "",
  permanentInstructions: "Entregar archivos completos.",
  projectRules: "No modificar checkout sin aprobación.",
  conventions: "TypeScript estricto.",
  budgetAmount: "1500.50",
  budgetCurrency: "MXN",
  technologyIds: ["550e8400-e29b-41d4-a716-446655440000"],
};

describe("projectFormSchema", () => {
  it("accepts a complete valid project", () => {
    expect(projectFormSchema.safeParse(validProject).success).toBe(true);
  });

  it("rejects URLs without protocol", () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      productionUrl: "example.com",
    });

    expect(result.success).toBe(false);
  });

  it("rejects budget values with more than two decimals", () => {
    const result = projectFormSchema.safeParse({
      ...validProject,
      budgetAmount: "100.999",
    });

    expect(result.success).toBe(false);
  });

  it("parses empty and numeric budgets", () => {
    expect(parseProjectBudget("")).toBeNull();
    expect(parseProjectBudget("2500.25")).toBe(2500.25);
  });
});
