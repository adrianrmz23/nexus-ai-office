import { describe, expect, it } from "vitest";

import {
  analyticsSettingsSchema,
  feedbackFormSchema,
} from "@/modules/analytics/domain/analytics-schema";

describe("feedbackFormSchema", () => {
  it("normalizes valid feedback", () => {
    const result = feedbackFormSchema.parse({
      messageId: "11111111-1111-4111-8111-111111111111",
      verdict: "accepted",
      rating: "5",
      correctionCount: "0",
      notes: "Resultado correcto",
      estimatedMinutesSaved: "30",
    });

    expect(result.rating).toBe(5);
    expect(result.estimatedMinutesSaved).toBe(30);
  });

  it("rejects ratings outside the supported range", () => {
    const result = feedbackFormSchema.safeParse({
      messageId: "11111111-1111-4111-8111-111111111111",
      verdict: "partial",
      rating: 6,
      correctionCount: 0,
      notes: "",
      estimatedMinutesSaved: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("analyticsSettingsSchema", () => {
  it("normalizes the display currency and accepts a manual exchange rate", () => {
    const result = analyticsSettingsSchema.parse({
      displayCurrency: "mxn",
      usdToDisplayRate: "18.75",
      acceptedMinutesSaved: "25",
      partialMinutesSaved: "12",
      rejectedMinutesSaved: "0",
    });

    expect(result.displayCurrency).toBe("MXN");
    expect(result.usdToDisplayRate).toBe(18.75);
  });
});
