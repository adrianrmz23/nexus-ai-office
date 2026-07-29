import { describe, expect, it } from "vitest";

import { estimateModelCost } from "@/modules/conversations/application/usage";

describe("estimateModelCost", () => {
  it("calcula el costo con precios por millón", () => {
    expect(
      estimateModelCost({
        inputTokens: 1000,
        outputTokens: 500,
        inputCostPerMillion: 2,
        outputCostPerMillion: 8,
      }),
    ).toBe(0.006);
  });

  it("devuelve null cuando faltan precios", () => {
    expect(
      estimateModelCost({
        inputTokens: 1000,
        outputTokens: 500,
        inputCostPerMillion: null,
        outputCostPerMillion: 8,
      }),
    ).toBeNull();
  });
});
