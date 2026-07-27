import { describe, expect, it } from "vitest";

import {
  confirmationSchema,
  loginSchema,
  signUpSchema,
} from "@/lib/validators/auth";

describe("validadores de autenticación", () => {
  it("acepta credenciales de inicio de sesión válidas", () => {
    const result = loginSchema.safeParse({
      email: "adrian@example.com",
      password: "una-clave",
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un registro con contraseñas diferentes", () => {
    const result = signUpSchema.safeParse({
      fullName: "Adrián Ramírez",
      email: "adrian@example.com",
      password: "Nexus2026",
      passwordConfirmation: "Otra2026",
    });

    expect(result.success).toBe(false);
  });

  it("solo acepta códigos de confirmación de seis dígitos", () => {
    expect(
      confirmationSchema.safeParse({
        email: "adrian@example.com",
        token: "123456",
      }).success,
    ).toBe(true);

    expect(
      confirmationSchema.safeParse({
        email: "adrian@example.com",
        token: "12345",
      }).success,
    ).toBe(false);
  });
});
