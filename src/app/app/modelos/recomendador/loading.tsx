export default function ModelRecommenderLoading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-8 w-72 rounded-lg bg-white/[0.04]" />
      <div className="h-72 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="h-80 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
        <div className="space-y-4">
          <div className="h-36 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
          <div className="h-36 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
        </div>
      </div>
    </div>
  );
}
