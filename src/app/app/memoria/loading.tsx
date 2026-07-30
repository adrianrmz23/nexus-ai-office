export default function MemoryLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-9 w-64 rounded-lg bg-muted/50" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-border bg-muted/30" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 rounded-2xl border border-border bg-muted/30" />
        <div className="h-96 rounded-2xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}
