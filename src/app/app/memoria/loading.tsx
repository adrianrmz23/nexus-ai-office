export default function MemoryLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-9 w-64 rounded-lg bg-white/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
        <div className="h-96 rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
      </div>
    </div>
  );
}
