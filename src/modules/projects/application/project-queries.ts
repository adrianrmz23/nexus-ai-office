import type { CurrentWorkspaceContext } from "@/modules/workspaces/application/require-current-workspace";
import type { ProjectTechnologyRecord } from "@/modules/projects/domain/project";

type RawTechnology = ProjectTechnologyRecord["technology"];

type RawProjectTechnology = {
  project_id: string;
  technology_id: string;
  technologies: RawTechnology | RawTechnology[] | null;
};

export async function loadProjectTechnologies(
  supabase: CurrentWorkspaceContext["supabase"],
  workspaceId: string,
  projectIds: string[],
): Promise<{
  byProject: Map<string, ProjectTechnologyRecord[]>;
  error: string | null;
}> {
  const byProject = new Map<string, ProjectTechnologyRecord[]>();

  if (projectIds.length === 0) {
    return { byProject, error: null };
  }

  const { data, error } = await supabase
    .from("project_technologies")
    .select(
      "project_id, technology_id, technologies(id, name, color, icon, version, status)",
    )
    .eq("workspace_id", workspaceId)
    .in("project_id", projectIds)
    .order("created_at", { ascending: true });

  if (error) {
    return {
      byProject,
      error:
        "No pudimos consultar las tecnologías asignadas. Verifica la migración del Bloque 03.",
    };
  }

  for (const row of (data ?? []) as unknown as RawProjectTechnology[]) {
    const rawTechnology = Array.isArray(row.technologies)
      ? row.technologies[0]
      : row.technologies;

    if (!rawTechnology) {
      continue;
    }

    const current = byProject.get(row.project_id) ?? [];
    current.push({
      project_id: row.project_id,
      technology_id: row.technology_id,
      technology: rawTechnology,
    });
    byProject.set(row.project_id, current);
  }

  return { byProject, error: null };
}
