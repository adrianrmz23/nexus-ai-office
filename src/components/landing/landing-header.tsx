import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { buttonVariants } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-8">
        <BrandMark />

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-7 md:flex"
        >
          <Link
            href="#capacidades"
            className="nexus-focus rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Capacidades
          </Link>
          <Link
            href="#arquitectura"
            className="nexus-focus rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Arquitectura
          </Link>
          <Link
            href="/iniciar-sesion"
            className="nexus-focus rounded-md text-sm text-secondary-foreground transition-colors hover:text-foreground"
          >
            Iniciar sesión
          </Link>
        </nav>

        <Link href="/registro" className={buttonVariants({ size: "sm" })}>
          Crear oficina
          <ArrowUpRight />
        </Link>
      </div>
    </header>
  );
}
