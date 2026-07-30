import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectForm } from "@/components/projects/project-form";
import { createProject } from "@/modules/projects/application/project-actions";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Nuevo proyecto",
};

type NewProjectPageProps = {
  searchParams: Promise<{ error?: string }>;
};

type TechnologyChoice = {
  id: string;
  name: string;
  category: string;
  version: string | null;
  status: "active" | "inactive";
  color: string;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { error } = await searchParams;
  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirect(
      "/app/proyectos?error=Solo%20propietarios%20y%20administradores%20pueden%20crear%20proyectos.",
    );
  }

  const { data } = await supabase
    .from("technologies")
    .select("id, name, category, version, status, color")
    .eq("workspace_id", membership.workspaceId)
    .neq("status", "archived")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div>
        <div className="nexus-kicker">Gestión operativa</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
          Nuevo proyecto
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Crea un espacio aislado para su stack, reglas, entornos y memoria futura.
        </p>
      </div>

      <div className="mt-8">
        <ProjectForm
          action={createProject}
          error={error}
          mode="create"
          technologies={(data ?? []) as TechnologyChoice[]}
        />
      </div>
    </div>
  );
}
