import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

import { createWorkspace } from "./actions";

export const metadata: Metadata = {
  title: "Configurar oficina",
};

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { data: existingMembership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    redirect("/app");
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-12">
      <div className="nexus-grid pointer-events-none absolute inset-0" />

      <section className="relative z-10 w-full max-w-3xl">
        <BrandMark className="mb-10" />

        <div className="nexus-panel grid overflow-hidden rounded-2xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-white/[0.06] bg-black/10 p-6 sm:p-8 md:border-r md:border-b-0">
            <div className="grid size-11 place-items-center rounded-xl border border-primary/15 bg-primary/[0.05]">
              <Building2 className="size-5 text-primary" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white">
              Nombra tu oficina
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Será el espacio superior que agrupe tus proyectos, agentes,
              modelos y permisos.
            </p>

            <div className="mt-7 space-y-3">
              {[
                "Separación estricta de datos",
                "Miembros y roles preparados",
                "Puedes cambiar el nombre después",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-xs text-slate-500"
                >
                  <CheckCircle2 className="size-3.5 text-primary/70" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="nexus-kicker">Paso 1 de 4</div>
            <form action={createWorkspace} className="mt-7 space-y-5">
              <FormMessage error={error} />

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la oficina</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej. Oficina de Adrián"
                  autoFocus
                  required
                />
                <p className="text-xs leading-5 text-slate-600">
                  Después agregaremos tecnologías, el primer proyecto y su
                  equipo de agentes.
                </p>
              </div>

              <Button type="submit" className="w-full">
                Crear oficina y continuar
                <ArrowRight />
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
