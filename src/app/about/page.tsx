import Link from 'next/link';

export default function AboutPage() {
  const sources = [
    'r/askTO',
    'r/toronto',
    'r/torontofood',
    'r/FoodToronto',
    'BlogTO',
    'Narcity',
    'Toronto Life',
    'NOW Magazine',
    'Eater Toronto',
  ];

  const steps = [
    { num: 1, text: 'We scrape Reddit + publications for mentions of Toronto places' },
    { num: 2, text: 'AI extracts place names and figures out what kind of place it is' },
    { num: 3, text: 'Places are geocoded and mapped so you can explore them visually' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-10 h-12 flex items-center px-4 gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#ff6b35] transition-colors font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to map
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 pb-20 page-enter">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">About BuzzMaps</h1>
          <p className="text-slate-500 text-base leading-relaxed">
            BuzzMaps aggregates mentions of Toronto places from Reddit, BlogTO, Narcity, Toronto Life, and other local sources. Find where locals actually go.
          </p>
        </div>

        {/* Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Sources</h2>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <span
                key={source}
                className="px-3 py-1.5 bg-[#ff6b35]/10 text-[#ff6b35] rounded-full text-sm font-medium"
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">How it works</h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {step.num}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed pt-1.5">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Explore the map
        </Link>
      </div>
    </div>
  );
}
