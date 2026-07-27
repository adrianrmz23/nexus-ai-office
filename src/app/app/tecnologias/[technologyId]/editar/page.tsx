import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TechnologyForm } from "@/components/technologies/technology-form";
import { updateTechnology } from "@/modules/technologies/application/technology-actions";
import type { TechnologyRecord } from "@/modules/technologies/domain/technology";
import { technologyIdSchema } from "@/modules/technologies/domain/technology-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Editar tecnología",
};

type EditTechnologyPageProps = {
  params: Promise<{ technologyId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditTechnologyPage({
  params,
  searchParams,
}: EditTechnologyPageProps) {
  const { technologyId } = await params;
  const { error } = await searchParams;
  const idResult = technologyIdSchema.safeParse(technologyId);

  if (!idResult.success) {
    notFound();
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirect(
      "/app/tecnologias?error=Solo%20propietarios%20y%20administradores%20pueden%20editar%20tecnolog%C3%ADas.",
    );
  }

  const { data } = await supabase
    .from("technologies")
    .select(
      "id, workspace_id, name, slug, category, description, icon, color, version, official_docs_url, tags, technical_prompt, status, created_at, updated_at, archived_at",
    )
    .eq("id", idResult.data)
    .eq("workspace_id", membership.workspaceId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const technology = data as TechnologyRecord;

  return (
    <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
      <div>
        <div className="nexus-kicker">Catálogo técnico</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
          Editar {technology.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Ajusta la información técnica sin perder su historial ni relaciones.
        </p>
      </div>

      <div className="mt-8">
        <TechnologyForm
          action={updateTechnology}
          error={error}
          technologyId={technology.id}
          mode="edit"
          initialValues={{
            name: technology.name,
            category: technology.category,
            description: technology.description,
            icon: technology.icon,
            color: technology.color,
            version: technology.version ?? "",
            officialDocsUrl: technology.official_docs_url ?? "",
            tags: technology.tags.join(", "),
            technicalPrompt: technology.technical_prompt,
            status: technology.status,
          }}
        />
      </div>
    </div>
  );
}
