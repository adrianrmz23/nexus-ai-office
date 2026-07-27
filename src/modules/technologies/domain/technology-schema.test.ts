import { describe, expect, it } from "vitest";

import {
  parseTechnologyTags,
  technologyFormSchema,
} from "@/modules/technologies/domain/technology-schema";

const validTechnology = {
  name: "Next.js",
  category: "framework",
  description: "Framework para aplicaciones web.",
  icon: "code-2",
  color: "#55e6c1",
  version: "16",
  officialDocsUrl: "https://nextjs.org/docs",
  tags: "React, SSR",
  technicalPrompt: "Utiliza App Router y TypeScript estricto.",
  status: "active",
};

describe("technologyFormSchema", () => {
  it("acepta una tecnología válida", () => {
    expect(technologyFormSchema.safeParse(validTechnology).success).toBe(true);
  });

  it("rechaza colores que no sean hexadecimales", () => {
    expect(
      technologyFormSchema.safeParse({
        ...validTechnology,
        color: "verde",
      }).success,
    ).toBe(false);
  });

  it("rechaza URLs sin protocolo", () => {
    expect(
      technologyFormSchema.safeParse({
        ...validTechnology,
        officialDocsUrl: "nextjs.org/docs",
      }).success,
    ).toBe(false);
  });
});

describe("parseTechnologyTags", () => {
  it("elimina duplicados y espacios vacíos", () => {
    expect(parseTechnologyTags("React, react,  SSR, , TypeScript ")).toEqual([
      "React",
      "SSR",
      "TypeScript",
    ]);
  });

  it("limita el catálogo a doce etiquetas", () => {
    const value = Array.from({ length: 20 }, (_, index) => `tag-${index}`).join(
      ",",
    );

    expect(parseTechnologyTags(value)).toHaveLength(12);
  });
});
