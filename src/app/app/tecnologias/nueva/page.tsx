import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TechnologyForm } from "@/components/technologies/technology-form";
import { createTechnology } from "@/modules/technologies/application/technology-actions";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Nueva tecnología",
};

type NewTechnologyPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewTechnologyPage({
  searchParams,
}: NewTechnologyPageProps) {
  const { error } = await searchParams;
  const { membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirect(
      "/app/tecnologias?error=Solo%20propietarios%20y%20administradores%20pueden%20crear%20tecnolog%C3%ADas.",
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-20 lg:pb-0">
      <div>
        <div className="nexus-kicker">Catálogo técnico</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
          Nueva tecnología
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Configura una especialidad reutilizable para los proyectos y agentes
          de {membership.role === "owner" ? "tu oficina" : "la oficina"}.
        </p>
      </div>

      <div className="mt-8">
        <TechnologyForm action={createTechnology} error={error} mode="create" />
      </div>
    </div>
  );
}
