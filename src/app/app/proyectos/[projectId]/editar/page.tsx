import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectForm } from "@/components/projects/project-form";
import { updateProject } from "@/modules/projects/application/project-actions";
import type { ProjectRecord } from "@/modules/projects/domain/project";
import { projectIdSchema } from "@/modules/projects/domain/project-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Editar proyecto",
};

type EditProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
};

type ProjectTechnologyAssignment = {
  technology_id: string;
};

type TechnologyChoice = {
  id: string;
  name: string;
  category: string;
  version: string | null;
  status: "active" | "inactive";
  color: string;
};

export default async function EditProjectPage({
  params,
  searchParams,
}: EditProjectPageProps) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const idResult = projectIdSchema.safeParse(projectId);

  if (!idResult.success) {
    notFound();
  }

  const { supabase, membership } = await requireCurrentWorkspace();

  if (membership.role === "member") {
    redirect(
      "/app/proyectos?error=Solo%20propietarios%20y%20administradores%20pueden%20editar%20proyectos.",
    );
  }

  const [projectResult, technologiesResult, assignmentsResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, workspace_id, name, slug, client_name, description, icon, color, status, priority, repository_url, production_url, staging_url, permanent_instructions, project_rules, conventions, budget_amount, budget_currency, created_at, updated_at, archived_at",
        )
        .eq("id", idResult.data)
        .eq("workspace_id", membership.workspaceId)
        .maybeSingle(),
      supabase
        .from("technologies")
        .select("id, name, category, version, status, color")
        .eq("workspace_id", membership.workspaceId)
        .neq("status", "archived")
        .order("name", { ascending: true }),
      supabase
        .from("project_technologies")
        .select("technology_id")
        .eq("workspace_id", membership.workspaceId)
        .eq("project_id", idResult.data),
    ]);

  if (!projectResult.data) {
    notFound();
  }

  const project = projectResult.data as ProjectRecord;
  const selectedTechnologyIds = (
    (assignmentsResult.data ?? []) as ProjectTechnologyAssignment[]
  ).map((assignment) => assignment.technology_id);

  return (
    <div className="mx-auto max-w-5xl pb-20 lg:pb-0">
      <div>
        <div className="nexus-kicker">Gestión operativa</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
          Editar {project.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Actualiza la configuración sin perder el historial ni el aislamiento
          del proyecto.
        </p>
      </div>

      <div className="mt-8">
        <ProjectForm
          action={updateProject}
          error={error}
          projectId={project.id}
          mode="edit"
          technologies={(technologiesResult.data ?? []) as TechnologyChoice[]}
          initialValues={{
            name: project.name,
            clientName: project.client_name ?? "",
            description: project.description,
            icon: project.icon,
            color: project.color,
            status: project.status,
            priority: project.priority,
            repositoryUrl: project.repository_url ?? "",
            productionUrl: project.production_url ?? "",
            stagingUrl: project.staging_url ?? "",
            permanentInstructions: project.permanent_instructions,
            projectRules: project.project_rules,
            conventions: project.conventions,
            budgetAmount:
              project.budget_amount === null ? "" : String(project.budget_amount),
            budgetCurrency: project.budget_currency,
            technologyIds: selectedTechnologyIds,
          }}
        />
      </div>
    </div>
  );
}
