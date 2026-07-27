import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CurrentWorkspaceContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: {
    id: string;
    email: string | null;
  };
  membership: {
    workspaceId: string;
    role: "owner" | "admin" | "member";
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function requireCurrentWorkspace(): Promise<CurrentWorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("id", membership.workspace_id)
    .eq("status", "active")
    .maybeSingle();

  if (!workspace) {
    redirect("/onboarding");
  }

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    membership: {
      workspaceId: membership.workspace_id,
      role: membership.role,
    },
    workspace,
  };
}
