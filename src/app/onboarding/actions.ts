"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const workspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres.")
    .max(80, "El nombre no puede superar 80 caracteres."),
});

export async function createWorkspace(formData: FormData) {
  const value = formData.get("name");
  const result = workspaceSchema.safeParse({
    name: typeof value === "string" ? value : "",
  });

  if (!result.success) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        result.error.issues[0]?.message ?? "Escribe un nombre válido.",
      )}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  const { error } = await supabase.rpc("create_workspace", {
    p_name: result.data.name,
  });

  if (error) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        "No pudimos crear la oficina. Verifica que ejecutaste la migración SQL.",
      )}`,
    );
  }

  redirect("/app");
}
