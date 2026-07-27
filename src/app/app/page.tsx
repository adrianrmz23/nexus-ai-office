import type { Metadata } from "next";
import Link from "next/link";
import {
  Blocks,
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  Fingerprint,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Centro de operaciones",
};

const foundations = [
  {
    title: "Identidad visual",
    detail: "Sistema oscuro, accesible y responsive",
    icon: Layers3,
  },
  {
    title: "Autenticación",
    detail: "Registro, confirmación y recuperación",
    icon: Fingerprint,
  },
  {
    title: "Aislamiento de datos",
    detail: "Workspaces protegidos mediante RLS",
    icon: ShieldCheck,
  },
  {
    title: "Catálogo de tecnologías",
    detail: "Alta, edición, estados y auditoría",
    icon: Blocks,
  },
];

export default async function AppDashboardPage() {
  const { supabase, membership } = await requireCurrentWorkspace();
  const [{ count: technologyCount }, { count: activeTechnologyCount }] =
    await Promise.all([
      supabase
        .from("technologies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId),
      supabase
        .from("technologies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "active"),
    ]);

  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="nexus-kicker">Estado de construcción</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
            El núcleo técnico está preparado.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            La identidad, el acceso, el aislamiento y el primer catálogo real
            están conectados. El siguiente bloque incorporará proyectos y sus
            tecnologías asignadas.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/12 bg-primary/[0.04] px-4 py-3">
          <span className="size-2 rounded-full bg-primary shadow-[0_0_10px_#55e6c1]" />
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Núcleo operativo
            </div>
            <div className="mt-1 font-mono text-[0.58rem] text-primary/70">
              ONLINE
            </div>
          </div>
        </div>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">
                Fundamentos
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Progreso real del producto
              </div>
            </div>
            <span className="font-mono text-xs text-primary">4 / 4</span>
          </div>

          <div className="mt-5 space-y-2">
            {foundations.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] p-3.5"
              >
                <div className="grid size-9 place-items-center rounded-lg border border-white/[0.06] bg-black/10">
                  <item.icon className="size-4 text-primary/85" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-200">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {item.detail}
                  </div>
                </div>
                <CheckCircle2 className="size-4 text-primary/80" />
              </div>
            ))}
          </div>
        </section>

        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <Database className="size-5 text-cyan-200/75" />
          <div className="mt-5 text-sm font-semibold text-slate-100">
            Catálogo protegido
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Las tecnologías pertenecen a la oficina actual. RLS impide que otro
            workspace consulte o modifique sus registros.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.055] bg-black/10 p-4">
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-600 uppercase">
                Registradas
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-100">
                {technologyCount ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.055] bg-black/10 p-4">
              <div className="font-mono text-[0.58rem] tracking-wider text-slate-600 uppercase">
                Activas
              </div>
              <div className="mt-2 text-xl font-semibold text-primary">
                {activeTechnologyCount ?? 0}
              </div>
            </div>
          </div>
          <Link
            href="/app/tecnologias"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
          >
            <Blocks />
            Abrir tecnologías
          </Link>
        </section>
      </div>

      <section className="nexus-panel mt-4 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
            <Bot className="size-4 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Siguiente bloque: proyectos
              </h2>
              <CircleDashed className="size-4 text-slate-700" />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Crearemos proyectos reales, asignaremos tecnologías y dejaremos
              preparada la selección inicial de agentes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
