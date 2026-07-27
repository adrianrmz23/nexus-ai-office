import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", membership.workspace_id)
    .single();

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      workspaceName={workspace.name}
      userEmail={user.email ?? "Usuario NEXUS"}
    >
      {children}
    </AppShell>
  );
}
