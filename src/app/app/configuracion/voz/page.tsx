import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VoiceSettingsForm } from "@/components/voice/voice-settings-form";
import { buttonVariants } from "@/components/ui/button";
import { saveVoiceSettings } from "@/modules/pendings/application/pending-actions";
import { loadVoiceSettings } from "@/modules/pendings/application/pending-queries";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Voz y audio" };

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function VoiceSettingsPage({ searchParams }: Props) {
  const messages = await searchParams;
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const settings = await loadVoiceSettings(supabase, membership.workspaceId, user.id);
  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <Link href="/app/configuracion" className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft />Volver a configuración</Link>
      <div className="mt-5"><div className="nexus-kicker">Interacción natural</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Voz y audio</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Configura dictado, lectura de respuestas, briefing hablado y notificaciones. El audio original no se guarda.</p></div>
      <div className="mt-7"><VoiceSettingsForm action={saveVoiceSettings} initial={settings} error={messages.error} success={messages.success} /></div>
    </div>
  );
}
