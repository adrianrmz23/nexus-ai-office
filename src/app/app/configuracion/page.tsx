import type { Metadata } from "next";
import { Accessibility, MonitorCog } from "lucide-react";

import { ThemeSettings } from "@/components/theme/theme-settings";

export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl pb-20 lg:pb-0">
      <div className="nexus-kicker">Preferencias de la oficina</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
        Configuración
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        Ajusta la apariencia de NEXUS para mantener una lectura cómoda durante sesiones prolongadas.
      </p>

      <section className="nexus-panel mt-7 rounded-2xl p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
            <MonitorCog className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="nexus-kicker">Apariencia</div>
            <h2 className="mt-2 text-lg font-semibold text-foreground">Tema de la interfaz</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              La preferencia se conserva en este navegador y se aplica antes de mostrar la interfaz para evitar destellos de color.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <ThemeSettings />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Accessibility className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Lectura y contraste</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ambos temas utilizan los mismos estados, jerarquías y acentos. El modo claro evita blancos extremos y conserva suficiente contraste en formularios, código, métricas y conversaciones.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
