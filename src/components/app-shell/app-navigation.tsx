"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  FolderKanban,
  FolderGit2,
  LayoutDashboard,
  MessageSquareText,
  Cpu,
  Settings2,
  ListTodo,
  PackageOpen,
  CalendarCheck2,
  ClipboardCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  mobileLabel?: string;
  href: string;
  icon: typeof LayoutDashboard;
  enabled: boolean;
  exact?: boolean;
};

const navigation: NavigationItem[] = [
  {
    label: "Panel general",
    mobileLabel: "Panel",
    href: "/app",
    icon: LayoutDashboard,
    enabled: true,
    exact: true,
  },
  {
    label: "Hoy",
    mobileLabel: "Hoy",
    href: "/app/hoy",
    icon: CalendarCheck2,
    enabled: true,
  },
  {
    label: "Pendientes",
    mobileLabel: "Pendientes",
    href: "/app/pendientes",
    icon: ClipboardCheck,
    enabled: true,
  },
  {
    label: "Proyectos",
    mobileLabel: "Proyectos",
    href: "/app/proyectos",
    icon: FolderKanban,
    enabled: true,
  },
  {
    label: "Repositorios",
    mobileLabel: "Código",
    href: "/app/repositorios",
    icon: FolderGit2,
    enabled: true,
  },
  {
    label: "Agentes",
    href: "/app/agentes",
    icon: Bot,
    enabled: true,
    mobileLabel: "Agentes",
  },
  {
    label: "Modelos IA",
    mobileLabel: "Modelos",
    href: "/app/modelos",
    icon: Cpu,
    enabled: true,
  },
  {
    label: "Conversaciones",
    mobileLabel: "Chat",
    href: "/app/conversaciones",
    icon: MessageSquareText,
    enabled: true,
  },
  {
    label: "Tareas",
    mobileLabel: "Tareas",
    href: "/app/tareas",
    icon: ListTodo,
    enabled: true,
  },
  {
    label: "Artefactos",
    mobileLabel: "Artefactos",
    href: "/app/artefactos",
    icon: PackageOpen,
    enabled: true,
  },
  {
    label: "Tecnologías",
    mobileLabel: "Tecnologías",
    href: "/app/tecnologias",
    icon: Blocks,
    enabled: true,
  },
  {
    label: "Memoria",
    href: "/app/memoria",
    icon: BrainCircuit,
    enabled: true,
    mobileLabel: "Memoria",
  },
  {
    label: "Analítica",
    href: "/app/analitica",
    icon: ChartNoAxesCombined,
    enabled: true,
  },
  {
    label: "Configuración",
    href: "/app/configuracion",
    icon: Settings2,
    enabled: true,
  },
];

function isActivePath(pathname: string, item: NavigationItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DesktopAppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="nexus-scrollbar flex-1 overflow-y-auto px-3 py-3">
      <div className="space-y-1">
        {navigation.map((item) => {
          const active = item.enabled && isActivePath(pathname, item);

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex h-10 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground/60"
                title="Este módulo se habilitará en los siguientes bloques"
                aria-disabled="true"
              >
                <item.icon className="size-4" />
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "nexus-focus flex h-10 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary/10 bg-primary/[0.065] text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileAppNavigation() {
  const pathname = usePathname();
  const mobileItems = navigation.filter(
    (item) =>
      item.enabled &&
      ["/app/hoy", "/app/pendientes", "/app/proyectos", "/app/tareas", "/app/conversaciones"].includes(item.href),
  );

  return (
    <>
      {mobileItems.map((item) => {
        const active = isActivePath(pathname, item);

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "nexus-focus flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2",
              active ? "text-primary" : "text-muted-foreground/80",
            )}
          >
            <item.icon className="size-4" />
            <span className="text-[0.58rem]">{item.mobileLabel}</span>
          </Link>
        );
      })}
    </>
  );
}
