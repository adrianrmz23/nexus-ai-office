"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileArchive, GitBranch, LoaderCircle, Upload } from "lucide-react";

import { FormMessage } from "@/components/auth/form-message";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RepositoryProjectOption } from "@/modules/repositories/domain/repository";
import { MAX_REPOSITORY_ZIP_BYTES } from "@/modules/repositories/domain/repository-limits";

function safeUploadName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180) || "repository.zip";
}

export function RepositoryImportForm({
  action,
  projects,
  workspaceId,
  initialProjectId,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  projects: RepositoryProjectOption[];
  workspaceId: string;
  initialProjectId?: string;
  error?: string;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const projectId = String(formData.get("projectId") ?? "");
    const file = formData.get("zipFile");

    if (!(file instanceof File) || file.size === 0) {
      setLocalError("Selecciona un archivo ZIP.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setLocalError("El archivo debe tener extensión .zip.");
      return;
    }
    if (file.size > MAX_REPOSITORY_ZIP_BYTES) {
      setLocalError("El ZIP supera el límite seguro de 12 MB.");
      return;
    }

    const storagePath = `${workspaceId}/${projectId}/uploads/${crypto.randomUUID()}-${safeUploadName(file.name)}`;
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
      setLocalError(`No pudimos subir el ZIP privado: ${uploadError.message}`);
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
      setLocalError(
        actionError instanceof Error ? actionError.message : "No pudimos completar la importación.",
      );
    }
  }

  const pending = phase !== "idle";

  return (
    <form onSubmit={handleSubmit} className="nexus-panel rounded-2xl p-5 sm:p-7">
      <FormMessage error={localError ?? error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="projectId">Proyecto</Label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={initialProjectId ?? projects[0]?.id ?? ""}
            className="nexus-focus mt-2 h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm text-foreground"
            required
            disabled={pending}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="name">Nombre interno</Label>
          <Input
            id="name"
            name="name"
            className="mt-2"
            placeholder="Ej. Nexus AI Office"
            minLength={2}
            maxLength={180}
            required
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="repositoryUrl">URL del repositorio opcional</Label>
          <Input
            id="repositoryUrl"
            name="repositoryUrl"
            type="url"
            className="mt-2"
            placeholder="https://github.com/..."
            disabled={pending}
          />
        </div>
        <div>
          <Label htmlFor="defaultBranch">Rama principal</Label>
          <Input
            id="defaultBranch"
            name="defaultBranch"
            className="mt-2"
            defaultValue="main"
            maxLength={120}
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.04] text-primary/75">
            <FileArchive className="size-5" />
          </div>
          <div>
            <Label htmlFor="zipFile">Archivo ZIP del código fuente</Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/80">
              Máximo 12 MB. La carga temporal va al Storage privado y se elimina después del análisis; NEXUS excluye
              node_modules, .git, .next, binarios, archivos mayores a 1 MB y posibles secretos.
            </p>
          </div>
        </div>
        <input
          id="zipFile"
          name="zipFile"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="nexus-focus mt-4 block w-full rounded-lg border border-input bg-card p-2.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary"
          required
          disabled={pending}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/app/repositorios" className={buttonVariants({ variant: "ghost" })}>
          <ArrowLeft /> Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={cn(buttonVariants(), "min-w-48")}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {phase === "uploading"
            ? "Subiendo ZIP privado..."
            : phase === "processing"
              ? "Analizando repositorio..."
              : "Importar repositorio"}
        </button>
      </div>
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground/80">
        <GitBranch className="mt-0.5 size-3.5 shrink-0" />
        Esta versión registra una referencia de GitHub, pero no clona ni escribe commits. La
        fuente real del inventario es el ZIP aprobado por ti.
      </div>
    </form>
  );
}
