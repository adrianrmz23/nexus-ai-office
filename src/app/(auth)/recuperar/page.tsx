import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestPasswordReset } from "../actions";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

type RecoveryPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function RecoveryPage({
  searchParams,
}: RecoveryPageProps) {
  const { error, success } = await searchParams;

  return (
    <AuthCard
      eyebrow="Recuperación"
      title="Recupera el acceso"
      description="Te enviaremos un enlace seguro para establecer una contraseña nueva."
      footer={
        <Link className="text-primary hover:underline" href="/iniciar-sesion">
          Volver al inicio de sesión
        </Link>
      }
    >
      <form action={requestPasswordReset} className="space-y-5">
        <FormMessage error={error} success={success} />

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

        <Button type="submit" className="w-full">
          Enviar instrucciones
        </Button>
      </form>
    </AuthCard>
  );
}
