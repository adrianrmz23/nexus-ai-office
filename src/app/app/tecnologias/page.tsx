import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { TechnologyCard } from "@/components/technologies/technology-card";
import { TechnologyEmptyState } from "@/components/technologies/technology-empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TECHNOLOGY_STATUS_LABELS,
  TECHNOLOGY_STATUSES,
  type TechnologyRecord,
  type TechnologyStatus,
} from "@/modules/technologies/domain/technology";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const metadata: Metadata = {
  title: "Tecnologías",
};

type TechnologiesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

function parseStatus(value?: string): TechnologyStatus | "all" {
  return TECHNOLOGY_STATUSES.includes(value as TechnologyStatus)
    ? (value as TechnologyStatus)
    : "all";
}

export default async function TechnologiesPage({
  searchParams,
}: TechnologiesPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const status = parseStatus(params.status);
  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage = membership.role === "owner" || membership.role === "admin";

  let technologiesQuery = supabase
    .from("technologies")
    .select(
      "id, workspace_id, name, slug, category, description, icon, color, version, official_docs_url, tags, technical_prompt, status, created_at, updated_at, archived_at",
    )
    .eq("workspace_id", membership.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    technologiesQuery = technologiesQuery.eq("status", status);
  }

  if (search) {
    technologiesQuery = technologiesQuery.ilike("name", `%${search}%`);
  }

  const [technologiesResult, totalResult, activeResult, archivedResult] =
    await Promise.all([
      technologiesQuery,
      supabase
        .from("technologies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId),
      supabase
        .from("technologies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "active"),
      supabase
        .from("technologies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId)
        .eq("status", "archived"),
    ]);

  const technologies = (technologiesResult.data ?? []) as TechnologyRecord[];
  const queryError = technologiesResult.error
    ? "No pudimos consultar el catálogo. Verifica que ejecutaste la migración del Bloque 02."
    : undefined;
  const isFiltered = Boolean(search) || status !== "all";

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Catálogo técnico</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">
            Tecnologías de la oficina
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Registra lenguajes, frameworks, plataformas y herramientas. Más
            adelante podrás asignarlos a proyectos, agentes y modelos.
          </p>
        </div>

        {canManage ? (
          <Link
            href="/app/tecnologias/nueva"
            className={buttonVariants({ size: "lg" })}
          >
            <Plus />
            Nueva tecnología
          </Link>
        ) : null}
      </div>

      <div className="mt-7">
        <FormMessage
          error={params.error ?? queryError}
          success={params.success}
        />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Total registradas",
            value: totalResult.count ?? 0,
            detail: "Catálogo completo",
          },
          {
            label: "Activas",
            value: activeResult.count ?? 0,
            detail: "Disponibles para proyectos",
          },
          {
            label: "Archivadas",
            value: archivedResult.count ?? 0,
            detail: "Conservadas en historial",
          },
        ].map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            <div className="font-mono text-[0.62rem] tracking-[0.14em] text-slate-600 uppercase">
              {item.label}
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
          </article>
        ))}
      </section>

      <section className="nexus-panel mt-5 rounded-2xl p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-[1fr_13rem_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-600" />
            <Input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre..."
              className="pl-10"
            />
          </div>

          <select
            name="status"
            defaultValue={status}
            aria-label="Filtrar por estado"
            className="nexus-focus h-11 rounded-lg border border-input bg-[#0b1219] px-3.5 text-sm text-foreground transition-colors hover:border-white/20"
          >
            <option value="all">Todos los estados</option>
            {TECHNOLOGY_STATUSES.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {TECHNOLOGY_STATUS_LABELS[itemStatus]}
              </option>
            ))}
          </select>

          <Button type="submit" variant="outline">
            Aplicar filtros
          </Button>
        </form>
      </section>

      {technologies.length > 0 ? (
        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          {technologies.map((technology) => (
            <TechnologyCard
              key={technology.id}
              technology={technology}
              canManage={canManage}
            />
          ))}
        </section>
      ) : (
        <TechnologyEmptyState filtered={isFiltered} canManage={canManage} />
      )}
    </div>
  );
}
