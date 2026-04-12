export default function CollectionsLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 animate-pulse">
        <div className="h-10 w-1/2 bg-slate-200 rounded" />
        <div className="mt-3 h-5 w-2/3 bg-slate-200 rounded" />

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="aspect-[16/9] bg-slate-200" />
              <div className="p-4">
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="mt-2 h-3 w-full bg-slate-200 rounded" />
                <div className="mt-1 h-3 w-5/6 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
