"use client";

import { useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MAX_REPOSITORY_ZIP_BYTES } from "@/modules/repositories/domain/repository-limits";

function safeUploadName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180) || "repository.zip";
}

export function RepositoryRefreshForm({
  action,
  workspaceId,
  projectId,
  repositoryId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  workspaceId: string;
  projectId: string;
  repositoryId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("zipFile");
    if (!(file instanceof File) || file.size === 0) {
      setError("Selecciona el ZIP actualizado.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("El archivo debe tener extensión .zip.");
      return;
    }
    if (file.size > MAX_REPOSITORY_ZIP_BYTES) {
      setError("El ZIP supera el límite seguro de 12 MB.");
      return;
    }

    const storagePath = `${workspaceId}/${projectId}/uploads/${repositoryId}/${crypto.randomUUID()}-${safeUploadName(file.name)}`;
    setPhase("uploading");
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("nexus-repositories")
      .upload(storagePath, file, {
        contentType: file.type || "application/zip",
        upsert: false,
      });
    if (uploadError) {
      setPhase("idle");
      setError(`No pudimos subir el ZIP privado: ${uploadError.message}`);
      return;
    }

    formData.delete("zipFile");
    formData.set("storagePath", storagePath);
    setPhase("processing");
    try {
      await action(formData);
    } catch (actionError) {
      await supabase.storage.from("nexus-repositories").remove([storagePath]);
      setPhase("idle");
      setError(
        actionError instanceof Error ? actionError.message : "No pudimos completar la actualización.",
      );
    }
  }

  const pending = phase !== "idle";

  return (
    <form
      onSubmit={handleSubmit}
      className="nexus-panel mt-5 flex flex-col gap-4 rounded-2xl p-4 lg:flex-row lg:items-end"
    >
      <input type="hidden" name="repositoryId" value={repositoryId} />
      <div className="min-w-0 flex-1">
        <label htmlFor="zipFile" className="text-sm font-medium text-foreground">
          Actualizar desde otro ZIP
        </label>
        <input
          id="zipFile"
          name="zipFile"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="nexus-focus mt-2 block w-full rounded-lg border border-input bg-card p-2 text-sm"
          required
          disabled={pending}
        />
        <p className="mt-2 text-xs text-muted-foreground/70">
          Crea versiones para archivos modificados y marca como retirados los que ya no estén.
        </p>
        {error ? <p className="mt-2 text-xs text-rose-700 dark:text-rose-200/75">{error}</p> : null}
      </div>
      <button type="submit" disabled={pending} className={cn(buttonVariants(), "min-w-52")}>
        {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
        {phase === "uploading"
          ? "Subiendo ZIP..."
          : phase === "processing"
            ? "Comparando..."
            : "Actualizar inventario"}
      </button>
    </form>
  );
}
