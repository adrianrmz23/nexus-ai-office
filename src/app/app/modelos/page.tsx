import { createElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BrainCircuit,
  Cpu,
  FilterX,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { ModelCard } from "@/components/models/model-card";
import { ProviderCard } from "@/components/models/provider-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  loadModelCatalog,
  loadProviders,
} from "@/modules/models/application/model-queries";
import {
  MODEL_STATUSES,
  MODEL_STATUS_LABELS,
} from "@/modules/models/domain/model";
import { requireCurrentWorkspace } from "@/modules/workspaces/application/require-current-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = { title: "Modelos y proveedores" };

type Props = {
  searchParams: Promise<{
    q?: string;
    provider?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function ModelsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = (params.q ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[,%()"'\\]/g, " ");
  const status = MODEL_STATUSES.includes(
    params.status as (typeof MODEL_STATUSES)[number],
  )
    ? params.status
    : "all";
  const { supabase, membership } = await requireCurrentWorkspace();
  const canManage =
    membership.role === "owner" || membership.role === "admin";
  const providers = await loadProviders(supabase, membership.workspaceId);
  const selectedProvider = providers.find(
    (provider) => provider.id === params.provider,
  );
  const providerId = selectedProvider?.id;

  const [models, allModels] = await Promise.all([
    loadModelCatalog(supabase, membership.workspaceId, {
      providerId,
      status,
      search,
    }),
    loadModelCatalog(supabase, membership.workspaceId),
  ]);

  const countByProvider = new Map<string, number>();
  for (const model of allModels) {
    countByProvider.set(
      model.provider_id,
      (countByProvider.get(model.provider_id) ?? 0) + 1,
    );
  }

  const stats = [
    {
      label: "Proveedores",
      value: providers.length,
      detail: `${providers.filter((provider) => provider.health_status === "healthy").length} conexiones operativas`,
      icon: Cpu,
    },
    {
      label: "Modelos",
      value: allModels.length,
      detail: "Catálogo de la oficina",
      icon: BrainCircuit,
    },
    {
      label: "Activos",
      value: allModels.filter((model) => model.status === "active").length,
      detail: "Disponibles para recomendar",
      icon: Sparkles,
    },
    {
      label: "Revisados",
      value: allModels.filter((model) => model.last_reviewed_at).length,
      detail: "Con validación manual",
      icon: Search,
    },
  ];

  const hasFilters = Boolean(providerId || search || status !== "all");

  return (
    <div className="mx-auto max-w-7xl pb-20 lg:pb-0">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="nexus-kicker">Inteligencia desacoplada</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground">
            Proveedores y modelos
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Configura conexiones del lado servidor, sincroniza catálogos y evalúa capacidades sin ligar los agentes a una sola IA.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/modelos/recomendador"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Sparkles />
            Probar recomendador
          </Link>
          {canManage ? (
            <Link
              href="/app/modelos/nuevo"
              className={buttonVariants({ size: "lg" })}
            >
              <Plus />
              Modelo manual
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-7">
        <FormMessage error={params.error} success={params.success} />
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="nexus-panel rounded-2xl p-5">
            {createElement(item.icon, {
              className: "size-4 text-primary/70",
              "aria-hidden": true,
            })}
            <div className="mt-4 font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground/80 uppercase">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">
              {item.detail}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <div className="nexus-kicker">Conexiones</div>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Proveedores disponibles
        </h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              modelCount={countByProvider.get(provider.id) ?? 0}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="nexus-kicker">Catálogo administrable</div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Modelos registrados
            </h2>
            {selectedProvider ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Mostrando {models.length} modelos de {selectedProvider.display_name}.
              </p>
            ) : null}
          </div>
          {hasFilters ? (
            <Link
              href="/app/modelos"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <FilterX />
              Limpiar filtros
            </Link>
          ) : null}
        </div>

        <div className="nexus-panel mt-4 rounded-2xl p-4 sm:p-5">
          <form className="grid gap-3 lg:grid-cols-[1fr_15rem_13rem_auto]">
            <Input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre o identificador..."
            />
            <select
              name="provider"
              defaultValue={providerId ?? ""}
              className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"
            >
              <option value="">Todos los proveedores</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              className="nexus-focus h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"
            >
              <option value="all">Todos los estados</option>
              {MODEL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {MODEL_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
            <button
              className={buttonVariants({ variant: "outline" })}
              type="submit"
            >
              Aplicar filtros
            </button>
          </form>
        </div>

        {models.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} canManage={canManage} />
            ))}
          </div>
        ) : (
          <div className="nexus-panel mt-4 rounded-2xl border-dashed p-8 text-center text-sm text-muted-foreground/80">
            No hay modelos que coincidan con los filtros.
          </div>
        )}
      </section>
    </div>
  );
}
