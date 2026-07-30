import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn } from "../actions";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, success, next } = await searchParams;

  return (
    <AuthCard
      eyebrow="Acceso seguro"
      title="Vuelve a tu oficina"
      description="Continúa trabajando con tus proyectos, agentes y decisiones guardadas."
      footer={
        <>
          ¿Todavía no tienes cuenta?{" "}
          <Link className="text-primary hover:underline" href="/registro">
            Crear oficina
          </Link>
        </>
      }
    >
      <form action={signIn} className="space-y-5">
        <FormMessage error={error} success={success} />
        <input type="hidden" name="next" value={next ?? "/app"} />

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/recuperar"
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              ¿La olvidaste?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Iniciar sesión
        </Button>
      </form>
    </AuthCard>
  );
}
