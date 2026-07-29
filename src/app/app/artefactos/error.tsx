"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ArtifactsError({ error, reset }: { error: Error; reset: () => void }) { return <div className="nexus-panel mx-auto max-w-3xl rounded-2xl p-8 text-center"><TriangleAlert className="mx-auto size-8 text-rose-300" /><h1 className="mt-4 text-xl font-semibold text-white">No pudimos cargar los artefactos</h1><p className="mt-2 text-sm text-slate-500">{error.message}</p><Button className="mt-5" onClick={reset}>Reintentar</Button></div>; }
