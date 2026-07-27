import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { confirmSignUp } from "../actions";

export const metadata: Metadata = {
  title: "Confirmar correo",
};

type ConfirmationPageProps = {
  searchParams: Promise<{
    email?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function ConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { email = "", error, success } = await searchParams;

  return (
    <AuthCard
      eyebrow="Verificación"
      title="Confirma tu correo"
      description="Escribe el código de 6 dígitos recibido. Si tu plantilla usa un enlace, también puedes abrirlo directamente."
      footer={
        <Link className="text-primary hover:underline" href="/iniciar-sesion">
          Volver al inicio de sesión
        </Link>
      }
    >
      <form action={confirmSignUp} className="space-y-5">
        <FormMessage error={error} success={success} />

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token">Código de confirmación</Label>
          <Input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            className="h-13 text-center font-mono text-lg tracking-[0.45em]"
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Confirmar cuenta
        </Button>
      </form>
    </AuthCard>
  );
}
