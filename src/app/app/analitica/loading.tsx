export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse pb-20 lg:pb-0">
      <div className="h-8 w-72 rounded bg-muted/60" />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 rounded-2xl bg-muted/45" />)}
      </div>
      <div className="mt-5 h-80 rounded-2xl bg-muted/45" />
    </div>
  );
}
