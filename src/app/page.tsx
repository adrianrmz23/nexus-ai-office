import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  Cable,
  Check,
  DatabaseZap,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { HeroConsole } from "@/components/landing/hero-console";
import { LandingHeader } from "@/components/landing/landing-header";
import { buttonVariants } from "@/components/ui/button";

const capabilities = [
  {
    icon: Boxes,
    title: "Proyectos con contexto propio",
    description:
      "Tecnologías, reglas, archivos, decisiones y memoria separadas por proyecto.",
  },
  {
    icon: Bot,
    title: "Agentes especializados",
    description:
      "Diseño, frontend, backend, Shopify, debugging, arquitectura y QA.",
  },
  {
    icon: BrainCircuit,
    title: "Memoria verificable",
    description:
      "Consulta qué información se recuperó, su fuente y por qué fue utilizada.",
  },
  {
    icon: Route,
    title: "Colaboración observable",
    description:
      "Handoffs, tareas, costos y resultados visibles antes de aprobar cambios.",
  },
  {
    icon: Cable,
    title: "Proveedores desacoplados",
    description:
      "OpenAI, Anthropic, Gemini, Kimi, OpenRouter y modelos compatibles.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad desde la base",
    description:
      "RLS, permisos, separación por oficina y confirmación de acciones sensibles.",
  },
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="nexus-grid pointer-events-none absolute inset-x-0 top-0 h-[58rem]" />
      <LandingHeader />

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pt-20 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pt-28 lg:pb-32">
        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.045] px-3 py-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="nexus-kicker">Developer operations system</span>
          </div>

          <h1 className="max-w-[12ch] text-[2.75rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance text-foreground sm:text-[3.45rem]">
            Tu oficina técnica, coordinada por IA.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-[1.05rem]">
            Organiza proyectos reales, crea agentes expertos y selecciona el
            modelo adecuado para cada tarea sin perder contexto, control ni
            trazabilidad.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/registro" className={buttonVariants({ size: "lg" })}>
              Crear mi oficina
              <ArrowRight />
            </Link>
            <Link
              href="/iniciar-sesion"
              className={buttonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              Ya tengo una cuenta
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Memoria por proyecto", "Multi-modelo", "Control humano"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary/75" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <HeroConsole />
      </section>

      <section
        id="capacidades"
        className="relative border-y border-border bg-muted/45"
      >
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-2xl">
            <div className="nexus-kicker">Capacidades del sistema</div>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.035em] text-foreground">
              Un centro de trabajo, no otro chat aislado.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              NEXUS conecta conocimiento, ejecución y decisiones para que cada
              proyecto acumule experiencia útil.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-muted/65 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="min-h-48 bg-sidebar p-6 transition-colors hover:bg-card"
              >
                <div className="grid size-10 place-items-center rounded-xl border border-primary/15 bg-primary/[0.045]">
                  <capability.icon className="size-4.5 text-primary/85" />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-foreground">
                  {capability.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="arquitectura"
        className="mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center"
      >
        <div>
          <div className="nexus-kicker">Arquitectura preparada para crecer</div>
          <h2 className="mt-4 max-w-lg text-3xl leading-tight font-semibold tracking-[-0.035em] text-foreground">
            El proyecto sigue siendo tuyo. El proveedor es intercambiable.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
            Los agentes trabajan contra interfaces comunes. Cambiar de modelo o
            combinar proveedores no obliga a reescribir la lógica del producto.
          </p>
        </div>

        <div className="nexus-panel rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="rounded-xl border border-border bg-muted/45 p-4">
              <DatabaseZap className="size-4 text-cyan-200/75" />
              <div className="mt-4 text-xs font-semibold text-foreground">
                Contexto del proyecto
              </div>
              <div className="mt-1.5 font-mono text-[0.58rem] text-muted-foreground/80">
                Memoria · archivos · reglas
              </div>
            </div>

            <ArrowRight className="size-4 text-muted-foreground/60" />

            <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-4">
              <BrainCircuit className="size-4 text-primary/80" />
              <div className="mt-4 text-xs font-semibold text-foreground">
                Orquestador
              </div>
              <div className="mt-1.5 font-mono text-[0.58rem] text-muted-foreground/80">
                Modelo · agentes · herramientas
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>NEXUS AI Office</span>
          <span>Construido para trabajo técnico real.</span>
        </div>
      </footer>
    </main>
  );
}
