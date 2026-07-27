import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  className?: string;
};

export function BrandMark({
  compact = false,
  href = "/",
  className,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="NEXUS AI Office"
      className={cn(
        "nexus-focus inline-flex items-center gap-3 rounded-lg",
        className,
      )}
    >
      <span className="relative grid size-9 place-items-center rounded-[0.7rem] border border-primary/25 bg-primary/[0.07] shadow-[inset_0_0_20px_rgba(85,230,193,0.06)]">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="size-[1.15rem] overflow-visible"
        >
          <path
            d="M7 24V8l18 16V8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.25"
            className="text-primary"
          />
          <circle cx="7" cy="8" r="2" className="fill-cyan-200" />
          <circle cx="25" cy="24" r="2" className="fill-primary" />
        </svg>
      </span>

      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-[0.15em] text-white">
            NEXUS
          </span>
          <span className="mt-1 font-mono text-[0.58rem] tracking-[0.19em] text-slate-500">
            AI OFFICE
          </span>
        </span>
      )}
    </Link>
  );
}
