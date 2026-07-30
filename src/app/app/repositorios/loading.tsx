export default function RepositoriesLoading() {
  return <div className="mx-auto max-w-[100rem] animate-pulse space-y-5"><div className="h-9 w-72 rounded bg-muted" /><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-2xl bg-muted" />)}</div><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-64 rounded-2xl bg-muted" />)}</div></div>;
}
