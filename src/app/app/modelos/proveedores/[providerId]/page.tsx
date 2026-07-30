import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, RefreshCcw, Save, ShieldCheck, Trash2, Wifi } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  deleteProviderCredential,
  saveProviderCredential,
  syncProviderModels,
  testProviderConnection,
  updateProviderSettings,
} from "@/modules/models/application/model-actions";
import { loadModelCatalog, loadProviders } from "@/modules/models/application/model-queries";
import { getProviderIcon, PROVIDER_STATUSES, PROVIDER_STATUS_LABELS } from "@/modules/models/domain/model";
import { uuidSchema } from "@/modules/models/domain/model-schema";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = { title: "Configurar proveedor" };
type Props = { params: Promise<{ providerId: string }>; searchParams: Promise<{ error?: string; success?: string }> };

export default async function ProviderPage({ params, searchParams }: Props) {
  const { providerId } = await params;
  const messages = await searchParams;
  const parsed = uuidSchema.safeParse(providerId);
  if (!parsed.success) notFound();
  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";
  const provider = (await loadProviders(supabase, membership.workspaceId)).find((item) => item.id === parsed.data);
  if (!provider) notFound();
  const models = await loadModelCatalog(supabase, membership.workspaceId, { providerId: provider.id });
  const { data: latestChecks } = await supabase
    .from("provider_health_checks")
    .select("id, status, response_time_ms, model_count, error_message, checked_at")
    .eq("workspace_id", membership.workspaceId)
    .eq("provider_id", provider.id)
    .order("checked_at", { ascending: false })
    .limit(5);
  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <Link href="/app/modelos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}><ArrowLeft />Volver al catálogo</Link>
      <div className="mt-5 flex items-start gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl border" style={{ color: provider.color, borderColor: `${provider.color}35`, backgroundColor: `${provider.color}10` }}>{createElement(getProviderIcon(provider.icon), { className: "size-6", "aria-hidden": true })}</div><div><div className="nexus-kicker">Proveedor de inteligencia</div><h1 className="mt-2 text-3xl font-semibold text-foreground">{provider.display_name}</h1><p className="mt-2 text-sm text-muted-foreground">{provider.base_url}</p></div></div>
      <div className="mt-7"><FormMessage error={messages.error} success={messages.success} /></div>
      <section className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <form action={updateProviderSettings} className="nexus-panel rounded-2xl p-5 sm:p-6"><input type="hidden" name="providerId" value={provider.id} /><div className="nexus-kicker">Configuración</div><h2 className="mt-2 text-base font-semibold text-foreground">Endpoint y estado</h2><div className="mt-5 space-y-5"><div className="space-y-2"><Label htmlFor="displayName">Nombre visible</Label><Input id="displayName" name="displayName" defaultValue={provider.display_name} disabled={!canManage} /></div><div className="space-y-2"><Label htmlFor="baseUrl">URL base</Label><Input id="baseUrl" name="baseUrl" type="url" defaultValue={provider.base_url} className="font-mono" disabled={!canManage} /></div><div className="space-y-2"><Label htmlFor="status">Estado</Label><select id="status" name="status" defaultValue={provider.status} disabled={!canManage} className="nexus-focus h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground">{PROVIDER_STATUSES.map((status) => <option key={status} value={status}>{PROVIDER_STATUS_LABELS[status]}</option>)}</select></div><div className="space-y-2"><Label htmlFor="notes">Notas internas</Label><Textarea id="notes" name="notes" defaultValue={provider.notes} maxLength={4000} disabled={!canManage} /></div></div>{canManage ? <FormSubmitButton type="submit" className="mt-5" pendingLabel="Guardando..."><Save />Guardar configuración</FormSubmitButton> : null}</form>
        <div className="space-y-4">
          <section className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="flex items-center gap-3"><KeyRound className="size-4 text-primary/70" /><h2 className="text-base font-semibold text-foreground">Credencial cifrada</h2></div><p className="mt-3 text-sm leading-6 text-muted-foreground">La clave se cifra con AES-256-GCM antes de almacenarse y nunca vuelve completa a la interfaz.</p><div className="mt-4 rounded-xl border border-border bg-muted/45 p-4 text-sm text-muted-foreground">{provider.credential_status === "configured" ? `Configurada · termina en ${provider.credential_last_four}` : "Todavía no hay una credencial."}</div>{canManage ? <form action={saveProviderCredential} className="mt-4 space-y-3"><input type="hidden" name="providerId" value={provider.id} /><Label htmlFor="apiKey">Nueva clave API</Label><Input id="apiKey" name="apiKey" type="password" autoComplete="new-password" placeholder="Se cifrará al guardar" minLength={8} required /><FormSubmitButton type="submit" pendingLabel="Cifrando..."><ShieldCheck />Guardar credencial</FormSubmitButton></form> : null}{canManage && provider.credential_status === "configured" ? <form action={deleteProviderCredential} className="mt-3"><input type="hidden" name="providerId" value={provider.id} /><ConfirmSubmitButton type="submit" variant="destructive" confirmationMessage="¿Eliminar la credencial cifrada?"><Trash2 />Eliminar credencial</ConfirmSubmitButton></form> : null}</section>
          <section className="nexus-panel rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Operación</div><h2 className="mt-2 text-base font-semibold text-foreground">Conexión y sincronización</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><form action={testProviderConnection}><input type="hidden" name="providerId" value={provider.id} /><FormSubmitButton type="submit" variant="outline" className="w-full" disabled={!canManage || provider.credential_status !== "configured"} pendingLabel="Probando..."><Wifi />Probar conexión</FormSubmitButton></form><form action={syncProviderModels}><input type="hidden" name="providerId" value={provider.id} /><FormSubmitButton type="submit" className="w-full" disabled={!canManage || provider.credential_status !== "configured"} pendingLabel="Sincronizando..."><RefreshCcw />Sincronizar modelos</FormSubmitButton></form></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-muted/45 p-4 text-sm text-muted-foreground">Estado<br /><span className="mt-1 block text-foreground">{provider.health_status}</span></div><div className="rounded-xl border border-border bg-muted/45 p-4 text-sm text-muted-foreground">Modelos<br /><span className="mt-1 block text-foreground">{models.length}</span></div></div></section>
        </div>
      </section>
      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6"><div className="nexus-kicker">Historial técnico</div><h2 className="mt-2 text-base font-semibold text-foreground">Últimas pruebas</h2><div className="mt-4 space-y-2">{(latestChecks ?? []).length ? (latestChecks ?? []).map((check) => <div key={check.id} className="grid gap-2 rounded-xl border border-border bg-muted/45 px-4 py-3 text-xs text-muted-foreground sm:grid-cols-4"><span>{check.status === "healthy" ? "Correcta" : "Error"}</span><span>{check.response_time_ms ?? 0} ms</span><span>{check.model_count ?? 0} modelos</span><span>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(check.checked_at))}</span></div>) : <p className="text-sm text-muted-foreground/80">Todavía no se han realizado pruebas.</p>}</div></section>
    </div>
  );
}
