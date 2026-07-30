import { describe, expect, it } from "vitest";

import { calculateModelHistoryScore } from "@/modules/models/domain/model-history-score";

describe("calculateModelHistoryScore", () => {
  it("returns neutral score without feedback", () => {
    expect(calculateModelHistoryScore([])).toEqual({ score: 50, samples: 0 });
  });

  it("rewards accepted results and penalizes corrections", () => {
    const result = calculateModelHistoryScore([
      { rating: 5, verdict: "accepted", correctionCount: 0 },
      { rating: 4, verdict: "partial", correctionCount: 2 },
    ]);
    expect(result.samples).toBe(2);
    expect(result.score).toBe(85);
  });
});
