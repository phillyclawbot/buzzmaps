export default function DigestLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 animate-pulse">
        <div className="h-10 w-1/2 bg-slate-200 rounded" />
        <div className="mt-3 h-5 w-2/3 bg-slate-200 rounded" />

        <div className="mt-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-1/3 bg-slate-200 rounded" />
              <div className="mt-4 h-3 w-full bg-slate-200 rounded" />
              <div className="mt-1 h-3 w-11/12 bg-slate-200 rounded" />
              <div className="mt-1 h-3 w-4/5 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
