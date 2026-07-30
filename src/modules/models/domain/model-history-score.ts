export type ModelHistoryFeedback = {
  rating: number;
  verdict: "accepted" | "partial" | "rejected";
  correctionCount: number;
};

export function calculateModelHistoryScore(
  feedback: ModelHistoryFeedback[],
): { score: number; samples: number } {
  if (!feedback.length) return { score: 50, samples: 0 };
  const values = feedback.map((item) => {
    const verdictAdjustment =
      item.verdict === "accepted" ? 10 : item.verdict === "rejected" ? -20 : 0;
    return Math.max(
      0,
      Math.min(100, item.rating * 20 + verdictAdjustment - item.correctionCount * 5),
    );
  });
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    score: Math.round(average * 10) / 10,
    samples: feedback.length,
  };
}
