import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ModelForm } from "@/components/models/model-form";
import { updateModel } from "@/modules/models/application/model-actions";
import { loadModelCatalog, loadProviders } from "@/modules/models/application/model-queries";
import { uuidSchema } from "@/modules/models/domain/model-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Editar modelo" };
type Props = { params: Promise<{ modelId: string }>; searchParams: Promise<{ error?: string }> };
export default async function EditModelPage({ params, searchParams }: Props) {
  const { modelId } = await params;
  const messages = await searchParams;
  const parsed = uuidSchema.safeParse(modelId);
  if (!parsed.success) notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  if (membership.role === "member") redirect("/app/modelos?error=No%20tienes%20permiso%20para%20editar%20modelos.");
  const [providers, models, technologiesResult] = await Promise.all([
    loadProviders(supabase, membership.workspaceId),
    loadModelCatalog(supabase, membership.workspaceId),
    supabase.from("technologies").select("id, name, category").eq("workspace_id", membership.workspaceId).eq("status", "active").order("name"),
  ]);
  const model = models.find((item) => item.id === parsed.data);
  if (!model) notFound();
  return <div className="mx-auto max-w-6xl pb-20 lg:pb-0"><div className="nexus-kicker">Evaluación del catálogo</div><h1 className="mt-3 text-3xl font-semibold text-foreground">Editar {model.display_name}</h1><p className="mt-3 max-w-3xl text-sm text-muted-foreground">Revisa precios, capacidades y afinidades. Estos datos alimentan el recomendador.</p><div className="mt-7"><ModelForm action={updateModel} providers={providers.filter((provider) => provider.status !== "archived")} technologies={technologiesResult.data ?? []} model={model} error={messages.error} mode="edit" /></div></div>;
}
