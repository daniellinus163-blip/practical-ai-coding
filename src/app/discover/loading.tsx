export default function DiscoverLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12">
      <div className="h-10 w-48 animate-pulse bg-[var(--bg-2)]" />
      <div className="h-28 animate-pulse bg-[var(--bg-2)]" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-80 animate-pulse bg-[var(--bg-2)]" />
        <div className="h-80 animate-pulse bg-[var(--bg-2)]" />
      </div>
    </div>
  );
}
