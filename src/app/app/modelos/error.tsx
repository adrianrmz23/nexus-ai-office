"use client";
export default function ModelsError({ reset }: { reset: () => void }) {
  return <div className="nexus-panel mx-auto max-w-xl rounded-2xl p-8 text-center"><h2 className="text-lg font-semibold text-foreground">No pudimos cargar modelos</h2><button type="button" onClick={reset} className="mt-5 text-sm text-primary">Intentar de nuevo</button></div>;
}
