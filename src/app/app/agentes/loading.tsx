export default function AgentsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse pb-20 lg:pb-0">
      <div className="h-4 w-36 rounded bg-muted/50" />
      <div className="mt-4 h-9 w-72 rounded bg-muted/60" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-2xl bg-muted/45" />)}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 rounded-2xl bg-muted/45" />)}
      </div>
    </div>
  );
}
