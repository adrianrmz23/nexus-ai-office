import { AlertCircle, CheckCircle2 } from "lucide-react";

type FormMessageProps = {
  error?: string;
  success?: string;
};

export function FormMessage({ error, success }: FormMessageProps) {
  const message = error ?? success;

  if (!message) {
    return null;
  }

  const isError = Boolean(error);
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "flex gap-2.5 rounded-lg border border-rose-400/15 bg-rose-400/[0.06] px-3.5 py-3 text-sm leading-5 text-rose-200"
          : "flex gap-2.5 rounded-lg border border-primary/15 bg-primary/[0.05] px-3.5 py-3 text-sm leading-5 text-emerald-100"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
