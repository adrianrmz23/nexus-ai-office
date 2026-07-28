import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ModelForm } from "@/components/models/model-form";
import { createModel } from "@/modules/models/application/model-actions";
import { loadProviders } from "@/modules/models/application/model-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Nuevo modelo" };
type Props = { searchParams: Promise<{ error?: string }> };
export default async function NewModelPage({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();
  if (membership.role === "member") redirect("/app/modelos?error=No%20tienes%20permiso%20para%20crear%20modelos.");
  const [providers, technologiesResult] = await Promise.all([
    loadProviders(supabase, membership.workspaceId),
    supabase.from("technologies").select("id, name, category").eq("workspace_id", membership.workspaceId).eq("status", "active").order("name"),
  ]);
  return <div className="mx-auto max-w-6xl pb-20 lg:pb-0"><div className="nexus-kicker">Catálogo administrable</div><h1 className="mt-3 text-3xl font-semibold text-white">Agregar modelo manual</h1><p className="mt-3 max-w-3xl text-sm text-slate-400">Úsalo para endpoints locales, modelos privados o registros que requieran evaluación manual.</p><div className="mt-7"><ModelForm action={createModel} providers={providers.filter((provider) => provider.status !== "archived")} technologies={technologiesResult.data ?? []} error={params.error} mode="create" /></div></div>;
}
