import { cn } from "@/lib/utils";
import type { DiffLine } from "@/modules/artifacts/domain/line-diff";

export function DiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="nexus-scrollbar max-h-[38rem] overflow-auto rounded-xl border border-border bg-muted/60 font-mono text-[0.68rem] leading-5">
      {lines.map((line, index) => (
        <div key={`${index}-${line.type}`} className={cn("grid grid-cols-[3rem_3rem_1.5rem_minmax(0,1fr)] border-b border-border", line.type === "added" && "bg-emerald-400/[0.055] text-emerald-100/80", line.type === "removed" && "bg-rose-400/[0.055] text-rose-100/75", line.type === "same" && "text-muted-foreground/80")}>
          <span className="border-r border-border px-2 py-1 text-right text-muted-foreground/60">{line.oldNumber ?? ""}</span>
          <span className="border-r border-border px-2 py-1 text-right text-muted-foreground/60">{line.newNumber ?? ""}</span>
          <span className="px-2 py-1">{line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}</span>
          <pre className="overflow-x-visible whitespace-pre px-2 py-1">{line.content || " "}</pre>
        </div>
      ))}
    </div>
  );
}
