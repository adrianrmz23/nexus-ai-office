import { describe, expect, it } from "vitest";

import { calculatePendingPriorityScore } from "@/modules/pendings/application/pending-queries";

const now = new Date(2026, 6, 30, 12, 0, 0);

describe("calculatePendingPriorityScore", () => {
  it("prioriza un pendiente urgente vencido", () => {
    expect(calculatePendingPriorityScore({ priority: "urgent", status: "pending", due_date: "2026-07-29", snoozed_until: null, postponed_count: 0 }, now)).toBe(115);
  });

  it("reduce temporalmente la prioridad de un pendiente pospuesto", () => {
    expect(calculatePendingPriorityScore({ priority: "urgent", status: "pending", due_date: "2026-07-30", snoozed_until: "2026-07-31T10:00:00.000Z", postponed_count: 2 }, now)).toBe(-100);
  });

  it("no asigna prioridad operativa a registros finalizados", () => {
    expect(calculatePendingPriorityScore({ priority: "urgent", status: "completed", due_date: "2026-07-29", snoozed_until: null, postponed_count: 5 }, now)).toBe(0);
  });
});
