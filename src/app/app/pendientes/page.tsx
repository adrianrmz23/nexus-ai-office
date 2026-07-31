import type { Metadata } from "next";
import Link from "next/link";
import { AlarmClock, CalendarDays, Inbox, List, Plus, Search, Sparkles, Target } from "lucide-react";

import { PendingCard } from "@/components/pendings/pending-card";
import { FocusTimer } from "@/components/pendings/focus-timer";
import { PendingCalendar } from "@/components/pendings/pending-calendar";
import { VoiceCommandCenter } from "@/components/voice/voice-command-center";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerNow } from "@/lib/server-date";
import { cn } from "@/lib/utils";
import { loadPendingCategories, loadPendingList, loadVoiceSettings, todayDateString } from "@/modules/pendings/application/pending-queries";
import { PENDING_PRIORITIES, PENDING_PRIORITY_LABELS, PENDING_STATUSES, PENDING_STATUS_LABELS, type PendingPriority, type PendingStatus } from "@/modules/pendings/domain/pending";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = { title: "Pendientes" };

type View = "today" | "inbox" | "calendar" | "list" | "focus";
type Props = { searchParams: Promise<{ view?: View; q?: string; status?: string; priority?: string; due?: string; category?: string }> };

const views: Array<{ value: View; label: string; icon: typeof List }> = [
  { value: "today", label: "Hoy", icon: AlarmClock },
  { value: "inbox", label: "Bandeja", icon: Inbox },
  { value: "calendar", label: "Calendario", icon: CalendarDays },
  { value: "list", label: "Lista", icon: List },
  { value: "focus", label: "Enfoque", icon: Target },
];

export default async function PendingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const view = views.some((item) => item.value === params.view) ? params.view! : "today";
  const { supabase, membership, user } = await requireCurrentWorkspace();
  const voiceSettings = await loadVoiceSettings(supabase, membership.workspaceId, user.id);
  const [pendings, categories] = await Promise.all([
    loadPendingList(supabase, membership.workspaceId, user.id, {
      query: params.q,
      status: (params.status as PendingStatus | "active" | "all" | undefined) ?? "active",
      priority: (params.priority as PendingPriority | "all" | undefined) ?? "all",
      due: (params.due as "today" | "overdue" | "week" | "none" | "all" | undefined) ?? "all",
      category: params.category,
      timeZone: voiceSettings.time_zone,
    }),
    loadPendingCategories(supabase, membership.workspaceId, user.id),
  ]);

  const today = todayDateString(getServerNow(), voiceSettings.time_zone);
  const active = pendings.filter((item) => !["completed", "cancelled", "archived"].includes(item.status));
  const available = active.filter((item) => item.priorityScore >= 0);
  const overdue = available.filter((item) => item.due_date && item.due_date < today);
  const todayItems = available.filter((item) => item.due_date === today);
  const inboxItems = active.filter((item) => item.status === "inbox");
  const focus = available[0] ?? null;

  const displayItems = view === "today" ? [...overdue, ...todayItems.filter((item) => !overdue.some((overdueItem) => overdueItem.id === item.id))] : view === "inbox" ? inboxItems : pendings;
  return (
    <div className="mx-auto max-w-[100rem] pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="nexus-kicker">Agenda personal</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Pendientes globales</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Administra compromisos que no pertenecen a proyectos: prioridades, fechas, recordatorios, repetición y subpendientes.</p></div>
        <Link href="/app/pendientes/nuevo" className={buttonVariants({ size: "lg" })}><Plus />Nuevo pendiente</Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="nexus-panel rounded-2xl p-5"><Inbox className="size-4 text-primary" /><div className="mt-4 text-2xl font-semibold">{inboxItems.length}</div><div className="mt-1 text-xs text-muted-foreground">Sin organizar</div></article>
        <article className="nexus-panel rounded-2xl p-5"><AlarmClock className="size-4 text-amber-500" /><div className="mt-4 text-2xl font-semibold">{todayItems.length}</div><div className="mt-1 text-xs text-muted-foreground">Para hoy</div></article>
        <article className="nexus-panel rounded-2xl p-5"><CalendarDays className="size-4 text-rose-500" /><div className="mt-4 text-2xl font-semibold">{overdue.length}</div><div className="mt-1 text-xs text-muted-foreground">Vencidos</div></article>
        <article className="nexus-panel rounded-2xl p-5"><Sparkles className="size-4 text-violet-500" /><div className="mt-4 text-2xl font-semibold">{active.length}</div><div className="mt-1 text-xs text-muted-foreground">Activos</div></article>
      </section>

      <div className="mt-5"><VoiceCommandCenter compact /></div>

      <nav className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
        {views.map((item) => { const Icon = item.icon; return <Link key={item.value} href={`/app/pendientes?view=${item.value}`} className={cn(buttonVariants({ variant: view === item.value ? "default" : "ghost", size: "sm" }))}><Icon />{item.label}</Link>; })}
      </nav>

      <form className="nexus-panel mt-4 grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_13rem_13rem_13rem_auto]">
        <input type="hidden" name="view" value={view} />
        <div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" /><Input name="q" defaultValue={params.q} placeholder="Buscar pendiente..." className="pl-10" /></div>
        <select name="status" defaultValue={params.status ?? "active"} className="nexus-focus h-11 rounded-lg border border-input bg-card px-3 text-sm"><option value="active">Activos</option><option value="all">Todos</option>{PENDING_STATUSES.map((status) => <option key={status} value={status}>{PENDING_STATUS_LABELS[status]}</option>)}</select>
        <select name="priority" defaultValue={params.priority ?? "all"} className="nexus-focus h-11 rounded-lg border border-input bg-card px-3 text-sm"><option value="all">Todas las prioridades</option>{PENDING_PRIORITIES.map((priority) => <option key={priority} value={priority}>{PENDING_PRIORITY_LABELS[priority]}</option>)}</select>
        <select name="category" defaultValue={params.category ?? ""} className="nexus-focus h-11 rounded-lg border border-input bg-card px-3 text-sm"><option value="">Todas las categorías</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
        <button className={buttonVariants({ variant: "secondary" })}>Aplicar</button>
      </form>

      {view === "focus" ? (
        <section className="mt-5">{focus ? <div className="mx-auto max-w-3xl"><div className="mb-3 text-center"><div className="nexus-kicker">Lo siguiente</div><h2 className="mt-2 text-xl font-semibold">Una prioridad a la vez</h2></div><PendingCard pending={focus} today={today} /><FocusTimer pendingId={focus.id} estimatedMinutes={focus.estimated_minutes} /></div> : <div className="nexus-panel rounded-2xl p-12 text-center text-muted-foreground">No hay pendientes activos para enfocar.</div>}</section>
      ) : view === "calendar" ? (
        <PendingCalendar pendings={active.filter((pending) => Boolean(pending.due_date))} today={today} />
      ) : (
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{displayItems.map((pending) => <PendingCard key={pending.id} pending={pending} today={today} />)}{!displayItems.length ? <div className="nexus-panel col-span-full rounded-2xl p-12 text-center"><div className="text-base font-semibold">No hay pendientes para esta vista</div><p className="mt-2 text-sm text-muted-foreground">Crea un registro o cambia los filtros.</p></div> : null}</section>
      )}
    </div>
  );
}
