"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Braces,
  CheckCircle2,
  Circle,
  Database,
  GitBranch,
  Palette,
  Radio,
} from "lucide-react";

const agents = [
  {
    name: "Orquestador",
    detail: "Analizando la solicitud",
    icon: Radio,
    status: "active",
  },
  {
    name: "Diseño UI",
    detail: "Contexto disponible",
    icon: Palette,
    status: "ready",
  },
  {
    name: "Frontend",
    detail: "React · Next.js",
    icon: Braces,
    status: "ready",
  },
  {
    name: "Backend",
    detail: "Supabase · PostgreSQL",
    icon: Database,
    status: "ready",
  },
];

export function HeroConsole() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="nexus-panel relative overflow-hidden rounded-2xl"
    >
      <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-rose-400/75" />
          <span className="size-2 rounded-full bg-amber-300/75" />
          <span className="size-2 rounded-full bg-primary/75" />
        </div>
        <div className="font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
          Oficina / Operación activa
        </div>
      </div>

      <div className="grid min-h-[28rem] md:grid-cols-[0.78fr_1.22fr]">
        <aside className="border-b border-border p-4 md:border-r md:border-b-0">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary-foreground">
              Equipo asignado
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[0.62rem] text-primary">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_#55e6c1]" />
              4 agentes
            </span>
          </div>

          <div className="space-y-2">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.38 + index * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/35 p-3"
              >
                <div className="grid size-8 place-items-center rounded-lg border border-border bg-secondary">
                  <agent.icon className="size-4 text-secondary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {agent.name}
                  </div>
                  <div className="mt-1 truncate font-mono text-[0.58rem] text-muted-foreground">
                    {agent.detail}
                  </div>
                </div>
                {agent.status === "active" ? (
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                ) : (
                  <Circle className="size-2 fill-slate-600 text-muted-foreground/80" />
                )}
              </motion.div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <div className="border-b border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="nexus-kicker">Solicitud actual</div>
                <p className="mt-3 max-w-md text-sm leading-6 text-secondary-foreground">
                  Analiza el error del filtro de colecciones, encuentra la causa
                  y entrega los archivos completos.
                </p>
              </div>
              <Bot className="mt-1 size-5 text-primary/80" />
            </div>
          </div>

          <div className="flex-1 space-y-4 p-5">
            <div className="rounded-xl border border-cyan-200/[0.08] bg-cyan-200/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.62rem] tracking-[0.14em] text-cyan-100/70 uppercase">
                  Recomendación de modelo
                </span>
                <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-1 font-mono text-[0.58rem] text-primary">
                  91% confianza
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">
                Modelo especializado en código y contexto extenso
              </div>
              <div className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Selección basada en Liquid, debugging, longitud de archivos y
                costo configurado.
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/45 p-3">
                <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                  <GitBranch className="size-3.5 text-cyan-200/70" />
                  Handoff preparado
                </div>
                <p className="mt-2 font-mono text-[0.58rem] leading-4 text-muted-foreground/80">
                  Debugging → Shopify/Liquid
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/45 p-3">
                <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                  <CheckCircle2 className="size-3.5 text-primary/80" />
                  Memoria aislada
                </div>
                <p className="mt-2 font-mono text-[0.58rem] leading-4 text-muted-foreground/80">
                  Proyecto: Tienda Integro
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-3 font-mono text-[0.58rem] tracking-wide text-muted-foreground/80">
            El usuario conserva el control de cada ejecución
          </div>
        </div>
      </div>
    </motion.div>
  );
}
