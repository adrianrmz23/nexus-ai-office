import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updatePassword } from "../actions";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const { error } = await searchParams;

  return (
    <AuthCard
      eyebrow="Seguridad"
      title="Establece una contraseña nueva"
      description="La nueva contraseña reemplazará la anterior en todos tus dispositivos."
    >
      <form action={updatePassword} className="space-y-5">
        <FormMessage error={error} />

        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
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
          Actualizar contraseña
        </Button>
      </form>
    </AuthCard>
  );
}
