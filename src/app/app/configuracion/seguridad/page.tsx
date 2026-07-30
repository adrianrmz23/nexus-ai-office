import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  DatabaseZap,
  Gauge,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadProductionReadiness } from "@/modules/security/application/security-queries";

export const metadata: Metadata = { title: "Seguridad y producción" };
export const dynamic = "force-dynamic";

const statusStyles = {
  pass: {
    icon: CheckCircle2,
    label: "Correcto",
    className: "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "Revisar",
    className: "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300",
  },
  fail: {
    icon: ShieldAlert,
    label: "Bloqueante",
    className: "border-destructive/25 bg-destructive/8 text-destructive",
  },
} as const;

export default async function SecuritySettingsPage() {
  const readiness = await loadProductionReadiness();
  const blocking = readiness.checks.filter((check) => check.status === "fail").length;
  const warnings = readiness.checks.filter((check) => check.status === "warning").length;

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <Link
        href="/app/configuracion"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-3")}
      >
        <ArrowLeft /> Volver a configuración
      </Link>

      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Defensa en profundidad</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Seguridad y preparación para producción
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Revisa RLS, Storage, credenciales, proveedores, límites operativos y configuración del despliegue sin exponer secretos.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.045] px-6 py-4">
          <div className="font-mono text-[0.58rem] tracking-[0.15em] text-muted-foreground uppercase">
            Preparación
          </div>
          <div className="mt-1 text-3xl font-semibold text-foreground">{readiness.score}%</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {blocking} bloqueantes · {warnings} advertencias
          </div>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="nexus-panel rounded-2xl p-5">
          <ShieldCheck className="size-4 text-primary" />
          <div className="mt-4 font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
            Comprobaciones
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{readiness.checks.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Validaciones automáticas</div>
        </article>
        <article className="nexus-panel rounded-2xl p-5">
          <DatabaseZap className="size-4 text-primary" />
          <div className="mt-4 font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
            Proveedores sanos
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">
            {readiness.providerSummary.healthy}/{readiness.providerSummary.configured}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Con credencial configurada</div>
        </article>
        <article className="nexus-panel rounded-2xl p-5">
          <Gauge className="size-4 text-primary" />
          <div className="mt-4 font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
            Ventanas limitadas
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{readiness.rateLimitWindows24h}</div>
          <div className="mt-1 text-xs text-muted-foreground">Actividad protegida en 24 h</div>
        </article>
        <article className="nexus-panel rounded-2xl p-5">
          <Activity className="size-4 text-primary" />
          <div className="mt-4 font-mono text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase">
            Última revisión
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">
            {new Intl.DateTimeFormat("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(readiness.checkedAt))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Datos calculados en servidor</div>
        </article>
      </section>

      <section className="mt-8">
        <div className="nexus-kicker">Checklist operativo</div>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Controles esenciales</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {readiness.checks.map((check) => {
            const style = statusStyles[check.status];
            return (
              <article key={check.id} className="nexus-panel rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/45 text-primary">
                      {createElement(style.icon, { className: "size-5" })}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{check.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[0.62rem] font-medium", style.className)}>
                    {style.label}
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
                  {check.detail}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 nexus-panel rounded-2xl p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 size-5 text-primary" />
          <div>
            <div className="nexus-kicker">Actividad de seguridad</div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Eventos recientes</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Se registran bloqueos y anomalías operativas, nunca claves completas ni contenido sensible.
            </p>
          </div>
        </div>

        {readiness.events.length ? (
          <div className="mt-5 space-y-3">
            {readiness.events.map((event) => (
              <article key={event.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{event.eventType}</div>
                    <div className="mt-1 font-mono text-[0.62rem] text-muted-foreground">
                      {event.source}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground uppercase">{event.severity}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(event.createdAt))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay eventos de seguridad registrados.
          </div>
        )}
      </section>
    </div>
  );
}
