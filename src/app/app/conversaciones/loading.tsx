export default function ConversationsLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-8 w-64 rounded-lg bg-muted/50" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl border border-border bg-muted/30" />
        ))}
      </div>
      <div className="h-20 rounded-2xl border border-border bg-muted/30" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-64 rounded-2xl border border-border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
