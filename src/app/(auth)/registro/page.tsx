import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signUp } from "../actions";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <AuthCard
      eyebrow="Nueva oficina"
      title="Crea tu centro de operaciones"
      description="Comenzaremos con tu perfil y después configuraremos la primera oficina."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link className="text-primary hover:underline" href="/iniciar-sesion">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form action={signUp} className="space-y-5">
        <FormMessage error={error} />

        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Tu nombre"
            required
          />
        </div>

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
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <p className="text-xs leading-5 text-slate-600">
            Mínimo 8 caracteres, una mayúscula, una minúscula y un número.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passwordConfirmation">Confirmar contraseña</Label>
          <Input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Crear cuenta
        </Button>
      </form>
    </AuthCard>
  );
}
