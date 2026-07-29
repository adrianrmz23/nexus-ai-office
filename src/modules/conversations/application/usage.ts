export function estimateModelCost(input: {
  inputTokens: number | null;
  outputTokens: number | null;
  inputCostPerMillion: number | null;
  outputCostPerMillion: number | null;
}): number | null {
  if (
    input.inputTokens === null ||
    input.outputTokens === null ||
    input.inputCostPerMillion === null ||
    input.outputCostPerMillion === null
  ) {
    return null;
  }

  const cost =
    (input.inputTokens / 1_000_000) * input.inputCostPerMillion +
    (input.outputTokens / 1_000_000) * input.outputCostPerMillion;

  return Math.round(cost * 100_000_000) / 100_000_000;
}
