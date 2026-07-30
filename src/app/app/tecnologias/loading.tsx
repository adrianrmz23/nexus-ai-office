export default function TechnologiesLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse pb-20 lg:pb-0">
      <div className="h-3 w-36 rounded bg-primary/10" />
      <div className="mt-5 h-9 w-72 max-w-full rounded bg-muted/65" />
      <div className="mt-4 h-4 w-[34rem] max-w-full rounded bg-muted/45" />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-2xl border border-border bg-muted/35"
          />
        ))}
      </div>

      <div className="mt-5 h-20 rounded-2xl border border-border bg-muted/35" />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-72 rounded-2xl border border-border bg-muted/35"
          />
        ))}
      </div>
    </div>
  );
}
