import Link from "next/link";
import { FileCode2, GitCommitHorizontal, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ARTIFACT_STATUS_LABELS,
  ARTIFACT_TYPE_LABELS,
  type ArtifactRecord,
} from "@/modules/artifacts/domain/artifact";

export function ArtifactCard({ artifact }: { artifact: ArtifactRecord }) {
  return (
    <Link href={`/app/artefactos/${artifact.id}`} className="nexus-focus block rounded-2xl border border-white/[0.06] bg-[#0b1219] p-5 transition-colors hover:border-primary/20 hover:bg-primary/[0.018]">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04]"><FileCode2 className="size-4 text-primary/75" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-200">{artifact.title}</h2>
            <span className={cn("rounded-full border px-2 py-0.5 text-[0.58rem]", artifact.status === "approved" ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300" : artifact.status === "changes_requested" || artifact.status === "rejected" ? "border-rose-400/15 bg-rose-400/[0.05] text-rose-300" : "border-white/[0.07] bg-white/[0.025] text-slate-500")}>{ARTIFACT_STATUS_LABELS[artifact.status]}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">{artifact.project?.name} · {ARTIFACT_TYPE_LABELS[artifact.artifact_type]}</p>
        </div>
      </div>
      {artifact.currentVersion?.content ? <p className="mt-4 line-clamp-3 font-mono text-[0.68rem] leading-5 text-slate-600">{artifact.currentVersion.content}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-4 text-[0.62rem] text-slate-600">
        <span className="inline-flex items-center gap-1"><GitCommitHorizontal className="size-3" />v{artifact.current_version_number}</span>
        {artifact.language ? <span>{artifact.language}</span> : null}
        {artifact.file_path ? <span className="max-w-52 truncate">{artifact.file_path}</span> : null}
        {artifact.task ? <span className="inline-flex min-w-0 items-center gap-1"><ListChecks className="size-3" /><span className="max-w-48 truncate">{artifact.task.title}</span></span> : null}
      </div>
    </Link>
  );
}
