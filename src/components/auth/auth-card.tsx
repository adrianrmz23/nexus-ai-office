import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="w-full max-w-md">
      <BrandMark className="mb-10" />

      <div className="nexus-panel rounded-2xl p-6 sm:p-8">
        <div className="nexus-kicker">{eyebrow}</div>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>

        <div className="mt-7">{children}</div>
      </div>

      {footer && (
        <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
      )}
    </section>
  );
}
