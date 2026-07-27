import { AppShell } from "@/components/app-shell/app-shell";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, workspace } = await requireCurrentWorkspace();

  return (
    <AppShell
      workspaceName={workspace.name}
      userEmail={user.email ?? "Usuario NEXUS"}
    >
      {children}
    </AppShell>
  );
}
