import type { Metadata } from "next";
import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  Fingerprint,
  Layers3,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Centro de operaciones",
};

const foundations = [
  {
    title: "Identidad visual",
    detail: "Sistema oscuro, accesible y responsive",
    icon: Layers3,
    complete: true,
  },
  {
    title: "Autenticación",
    detail: "Registro, confirmación y recuperación",
    icon: Fingerprint,
    complete: true,
  },
  {
    title: "Aislamiento de datos",
    detail: "Workspaces protegidos mediante RLS",
    icon: ShieldCheck,
    complete: true,
  },
  {
    title: "Catálogo técnico",
    detail: "Tecnologías, proyectos y agentes",
    icon: Bot,
    complete: false,
  },
];

export default function AppDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="nexus-kicker">Estado de construcción</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
            La base de tu oficina está activa.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            La identidad, el acceso y el aislamiento por workspace están listos.
            El siguiente bloque habilitará el catálogo real de tecnologías,
            proyectos y agentes.
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
            <span className="font-mono text-xs text-primary">3 / 4</span>
          </div>

          <div className="mt-5 space-y-2">
            {foundations.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] p-3.5"
              >
                <div className="grid size-9 place-items-center rounded-lg border border-white/[0.06] bg-black/10">
                  <item.icon
                    className={
                      item.complete
                        ? "size-4 text-primary/85"
                        : "size-4 text-slate-600"
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-200">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {item.detail}
                  </div>
                </div>
                {item.complete ? (
                  <CheckCircle2 className="size-4 text-primary/80" />
                ) : (
                  <CircleDashed className="size-4 text-slate-700" />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="nexus-panel rounded-2xl p-5 sm:p-6">
          <Database className="size-5 text-cyan-200/75" />
          <div className="mt-5 text-sm font-semibold text-slate-100">
            Datos protegidos
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Tu usuario solo puede consultar oficinas donde tiene una membresía
            activa. La separación se aplica dentro de PostgreSQL, no únicamente
            en la interfaz.
          </p>
          <div className="mt-6 rounded-xl border border-white/[0.055] bg-black/10 p-4">
            <div className="font-mono text-[0.58rem] tracking-wider text-slate-600 uppercase">
              Política activa
            </div>
            <div className="mt-2 text-xs text-slate-300">
              workspace_members → auth.uid()
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
