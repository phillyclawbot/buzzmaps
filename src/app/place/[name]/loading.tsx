export default function PlaceLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 animate-pulse">
        <div className="h-5 w-20 bg-slate-200 rounded mb-4" />
        <div className="h-10 sm:h-12 w-3/4 bg-slate-200 rounded" />
        <div className="mt-3 h-5 w-1/2 bg-slate-200 rounded" />

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
          <div className="h-6 w-24 bg-slate-200 rounded-full" />
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
        </div>

        <div className="mt-6 aspect-[16/10] w-full bg-slate-200 rounded-2xl" />

        <div className="mt-8 space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-1/3 bg-slate-200 rounded" />
              <div className="mt-3 h-3 w-full bg-slate-200 rounded" />
              <div className="mt-1 h-3 w-5/6 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
