export default function CollectionDetailLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 animate-pulse">
        <div className="h-5 w-24 bg-slate-200 rounded mb-4" />
        <div className="h-10 w-2/3 bg-slate-200 rounded" />
        <div className="mt-3 h-5 w-1/2 bg-slate-200 rounded" />

        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4"
            >
              <div className="h-20 w-20 rounded-lg bg-slate-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="mt-2 h-3 w-1/3 bg-slate-200 rounded" />
                <div className="mt-3 h-3 w-full bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
