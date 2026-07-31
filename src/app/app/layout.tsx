import { AppShell } from "@/components/app-shell/app-shell";
import { DEFAULT_VOICE_SETTINGS, type VoiceSettingsRecord } from "@/modules/pendings/domain/pending";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export default async function ProtectedAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, workspace, membership, supabase } = await requireCurrentWorkspace();
  const { data: savedVoiceSettings } = await supabase
    .from("voice_settings")
    .select("*")
    .eq("workspace_id", membership.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  const voiceSettings: VoiceSettingsRecord = savedVoiceSettings
    ? ({ ...savedVoiceSettings, speech_rate: Number(savedVoiceSettings.speech_rate), speech_pitch: Number(savedVoiceSettings.speech_pitch), speech_volume: Number(savedVoiceSettings.speech_volume) } as VoiceSettingsRecord)
    : { workspace_id: membership.workspaceId, user_id: user.id, ...DEFAULT_VOICE_SETTINGS };

  return (
    <AppShell
      workspaceName={workspace.name}
      userEmail={user.email ?? "Usuario NEXUS"}
      voiceSettings={voiceSettings}
    >
      {children}
    </AppShell>
  );
}
