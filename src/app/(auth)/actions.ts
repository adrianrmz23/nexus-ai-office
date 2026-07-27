"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAppUrl,
  getConfigurationMessage,
  hasSupabasePublicConfig,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  confirmationSchema,
  emailSchema,
  loginSchema,
  passwordUpdateSchema,
  signUpSchema,
} from "@/lib/validators/auth";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Revisa la información del formulario.";
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

function redirectWithMessage(
  pathname: string,
  type: "error" | "success",
  message: string,
): never {
  redirect(`${pathname}?${type}=${encodeURIComponent(message)}`);
}

function ensureConfiguration(pathname: string) {
  if (!hasSupabasePublicConfig()) {
    redirectWithMessage(pathname, "error", getConfigurationMessage());
  }
}

export async function signIn(formData: FormData) {
  ensureConfiguration("/iniciar-sesion");

  const result = loginSchema.safeParse({
    email: textValue(formData, "email"),
    password: textValue(formData, "password"),
  });

  if (!result.success) {
    redirectWithMessage("/iniciar-sesion", "error", firstIssue(result.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    redirectWithMessage(
      "/iniciar-sesion",
      "error",
      "No pudimos iniciar sesión. Revisa tu correo y contraseña.",
    );
  }

  redirect(safeNextPath(textValue(formData, "next")));
}

export async function signUp(formData: FormData) {
  ensureConfiguration("/registro");

  const result = signUpSchema.safeParse({
    fullName: textValue(formData, "fullName"),
    email: textValue(formData, "email"),
    password: textValue(formData, "password"),
    passwordConfirmation: textValue(formData, "passwordConfirmation"),
  });

  if (!result.success) {
    redirectWithMessage("/registro", "error", firstIssue(result.error));
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? getAppUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        full_name: result.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    redirectWithMessage(
      "/registro",
      "error",
      error.message.includes("already registered")
        ? "Ya existe una cuenta con este correo."
        : "No pudimos crear la cuenta. Inténtalo nuevamente.",
    );
  }

  redirect(
    `/confirmar?email=${encodeURIComponent(result.data.email)}&success=${encodeURIComponent(
      "Te enviamos un código o enlace de confirmación.",
    )}`,
  );
}

export async function confirmSignUp(formData: FormData) {
  ensureConfiguration("/confirmar");

  const result = confirmationSchema.safeParse({
    email: textValue(formData, "email"),
    token: textValue(formData, "token"),
  });

  if (!result.success) {
    const email = encodeURIComponent(textValue(formData, "email"));
    redirect(
      `/confirmar?email=${email}&error=${encodeURIComponent(firstIssue(result.error))}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: result.data.email,
    token: result.data.token,
    type: "signup",
  });

  if (error) {
    redirect(
      `/confirmar?email=${encodeURIComponent(result.data.email)}&error=${encodeURIComponent(
        "El código es incorrecto o ya expiró.",
      )}`,
    );
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(formData: FormData) {
  ensureConfiguration("/recuperar");

  const result = emailSchema.safeParse(textValue(formData, "email"));

  if (!result.success) {
    redirectWithMessage("/recuperar", "error", firstIssue(result.error));
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? getAppUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(result.data, {
    redirectTo: `${origin}/auth/callback?next=/actualizar-contrasena`,
  });

  if (error) {
    redirectWithMessage(
      "/recuperar",
      "error",
      "No pudimos enviar el correo de recuperación.",
    );
  }

  redirectWithMessage(
    "/recuperar",
    "success",
    "Si existe una cuenta con ese correo, recibirás las instrucciones.",
  );
}

export async function updatePassword(formData: FormData) {
  ensureConfiguration("/actualizar-contrasena");

  const result = passwordUpdateSchema.safeParse({
    password: textValue(formData, "password"),
    passwordConfirmation: textValue(formData, "passwordConfirmation"),
  });

  if (!result.success) {
    redirectWithMessage(
      "/actualizar-contrasena",
      "error",
      firstIssue(result.error),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    redirectWithMessage(
      "/actualizar-contrasena",
      "error",
      "No pudimos actualizar la contraseña. Solicita un enlace nuevo.",
    );
  }

  redirectWithMessage(
    "/iniciar-sesion",
    "success",
    "Tu contraseña fue actualizada correctamente.",
  );
}
