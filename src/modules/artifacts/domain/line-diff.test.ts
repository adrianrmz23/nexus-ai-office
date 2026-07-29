import { describe, expect, it } from "vitest";

import { computeLineDiff } from "@/modules/artifacts/domain/line-diff";

describe("computeLineDiff", () => {
  it("marks additions and removals", () => {
    const diff = computeLineDiff("uno\ndos", "uno\ntres");
    expect(diff.map((line) => line.type)).toEqual(["same", "removed", "added"]);
  });
});
