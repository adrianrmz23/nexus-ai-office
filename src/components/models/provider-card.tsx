import { createElement } from "react";
import Link from "next/link";
import { ArrowUpRight, KeyRound, Wifi, WifiOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProviderIcon,
  PROVIDER_STATUS_LABELS,
  type AIProviderRecord,
} from "@/modules/models/domain/model";

export function ProviderCard({ provider, modelCount }: { provider: AIProviderRecord; modelCount: number }) {
  return (
    <article className="nexus-panel rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl border"
          style={{ color: provider.color, borderColor: `${provider.color}35`, backgroundColor: `${provider.color}10` }}
        >
          {createElement(getProviderIcon(provider.icon), { className: "size-5", "aria-hidden": true })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100">{provider.display_name}</h3>
            <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[0.62rem] text-slate-500">
              {PROVIDER_STATUS_LABELS[provider.status]}
            </span>
          </div>
          <p className="mt-2 truncate font-mono text-[0.65rem] text-slate-600">{provider.base_url}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3">
          <div className="font-mono text-[0.52rem] text-slate-700 uppercase">Modelos</div>
          <div className="mt-2 text-sm text-slate-300">{modelCount}</div>
        </div>
        <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3">
          <div className="font-mono text-[0.52rem] text-slate-700 uppercase">Clave</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <KeyRound className="size-3" />
            {provider.credential_status === "configured" ? `••••${provider.credential_last_four}` : "Pendiente"}
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3">
          <div className="font-mono text-[0.52rem] text-slate-700 uppercase">Salud</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            {provider.health_status === "healthy" ? <Wifi className="size-3 text-emerald-300/70" /> : <WifiOff className="size-3" />}
            {provider.health_status}
          </div>
        </div>
      </div>
      <Link href={`/app/modelos/proveedores/${provider.id}`} className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full")}>
        Configurar proveedor
        <ArrowUpRight />
      </Link>
    </article>
  );
}
