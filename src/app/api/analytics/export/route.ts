import type { NextRequest } from "next/server";

import {
  analyticsToCsv,
  loadAnalyticsDashboard,
} from "@/modules/analytics/application/analytics-queries";
import { analyticsFiltersSchema } from "@/modules/analytics/domain/analytics-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = analyticsFiltersSchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? "30d",
    projectId: request.nextUrl.searchParams.get("project") ?? "",
  });
  if (!parsed.success) {
    return Response.json({ error: "Los filtros no son válidos." }, { status: 400 });
  }

  const { supabase, membership } = await requireCurrentWorkspace();
  const data = await loadAnalyticsDashboard(
    supabase,
    membership.workspaceId,
    parsed.data,
  );
  const csv = analyticsToCsv(data);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexus-analytics-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
