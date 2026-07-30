import type { ReactNode } from "react";
import { ChevronDown, LogOut } from "lucide-react";

import { signOut } from "@/app/app/actions";
import {
  DesktopAppNavigation,
  MobileAppNavigation,
} from "@/components/app-shell/app-navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  children: ReactNode;
  workspaceName: string;
  userEmail: string;
};

export function AppShell({
  children,
  workspaceName,
  userEmail,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-[4.5rem] items-center border-b border-sidebar-border px-5">
          <BrandMark href="/app" />
        </div>

        <div className="p-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/35 p-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/8 font-mono text-xs font-semibold text-primary">
              {workspaceName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">
                {workspaceName}
              </div>
              <div className="mt-1 font-mono text-[0.56rem] tracking-wider text-muted-foreground/80 uppercase">
                Oficina activa
              </div>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground/60" />
          </div>
        </div>

        <div className="px-6 pt-3 pb-1 font-mono text-[0.58rem] tracking-[0.16em] text-muted-foreground/60 uppercase">
          Módulos
        </div>
        <DesktopAppNavigation />

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-3 truncate px-3 text-xs text-muted-foreground/80">
            {userEmail}
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start"
            >
              <LogOut />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-border bg-background/88 px-5 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="lg:hidden">
            <BrandMark compact href="/app" />
          </div>
          <div className="hidden lg:block">
            <div className="text-sm font-medium text-foreground">
              Centro de operaciones
            </div>
            <div className="mt-1 font-mono text-[0.56rem] tracking-[0.14em] text-muted-foreground/80 uppercase">
              Sistema en línea
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher compact />
            <div className="hidden items-center gap-2 rounded-full border border-primary/10 bg-primary/4 px-3 py-1.5 sm:flex">
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_9px_#55e6c1]" />
              <span className="font-mono text-[0.58rem] tracking-wider text-primary/80 uppercase">
                Fase 7+
              </span>
            </div>
          </div>
        </header>

        <main className="px-5 py-8 sm:px-7 lg:px-9 lg:py-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t border-border bg-sidebar/95 backdrop-blur-xl lg:hidden">
          <MobileAppNavigation />
          <form action={signOut} className="flex flex-1 justify-center">
            <button
              type="submit"
              className="nexus-focus flex flex-col items-center gap-1 rounded-lg px-5 py-2 text-muted-foreground/80"
            >
              <LogOut className="size-4" />
              <span className="text-[0.62rem]">Salir</span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
