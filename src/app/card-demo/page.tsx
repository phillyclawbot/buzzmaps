"use client";

import { useState } from "react";

const SAMPLE = [
  {
    id: "1",
    name: "Pai Northern Thai Kitchen",
    category: "restaurant",
    address: "18 Duncan St, Toronto",
    mention_count: 47,
    google_rating: 4.6,
    latest_mention: Math.floor(Date.now() / 1000) - 3600 * 5,
    photo_url: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=400&q=80",
    buzz: 82,
    sentiment: { positive: 38, neutral: 7, negative: 2 },
    preview: "Best khao soi in the city, hands down. Been going for years.",
  },
  {
    id: "2",
    name: "Bar Raval",
    category: "bar",
    address: "505 College St, Toronto",
    mention_count: 31,
    google_rating: 4.4,
    latest_mention: Math.floor(Date.now() / 1000) - 86400 * 2,
    photo_url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80",
    buzz: 67,
    sentiment: { positive: 25, neutral: 4, negative: 2 },
    preview: "The pintxos and vermouth selection are unreal. Go early.",
  },
  {
    id: "3",
    name: "Pilot Coffee Roasters",
    category: "cafe",
    address: "55 Distillery Ln, Toronto",
    mention_count: 19,
    google_rating: 4.5,
    latest_mention: Math.floor(Date.now() / 1000) - 86400,
    photo_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80",
    buzz: 51,
    sentiment: { positive: 16, neutral: 3, negative: 0 },
    preview: "Single origin pours and great vibes. Laptop-friendly too.",
  },
  {
    id: "4",
    name: "Stackt Market",
    category: "shop",
    address: "28 Bathurst St, Toronto",
    mention_count: 12,
    google_rating: 4.2,
    latest_mention: Math.floor(Date.now() / 1000) - 86400 * 4,
    photo_url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&q=80",
    buzz: 38,
    sentiment: { positive: 9, neutral: 2, negative: 1 },
    preview: "Cool container market. Great for a weekend browse.",
  },
  {
    id: "5",
    name: "Trinity Bellwoods Park",
    category: "park",
    address: "790 Queen St W, Toronto",
    mention_count: 8,
    google_rating: 4.7,
    latest_mention: Math.floor(Date.now() / 1000) - 86400 * 6,
    photo_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    buzz: 29,
    sentiment: { positive: 7, neutral: 1, negative: 0 },
    preview: "Classic Toronto park. White squirrel sightings and picnics.",
  },
];

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  cafe: "☕",
  shop: "🛍️",
  park: "🌳",
  venue: "🎵",
};

const CATEGORY_COLOR: Record<string, string> = {
  restaurant: "#ff6b35",
  bar: "#7c3aed",
  cafe: "#b45309",
  shop: "#0891b2",
  park: "#16a34a",
  venue: "#db2777",
};

function timeAgo(utc: number) {
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ─── Card Style 1: Clean Minimal ─── */
function Card1({ p }: { p: typeof SAMPLE[0] }) {
  const color = CATEGORY_COLOR[p.category] || "#ff6b35";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <img src={p.photo_url} alt={p.name} className="w-full h-36 object-cover" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-900 text-sm leading-tight">{p.name}</h3>
          <span className="text-lg shrink-0">{CATEGORY_EMOJI[p.category]}</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">{p.address}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "18", color }}>
            {p.mention_count} mentions
          </span>
          <span className="text-xs text-amber-500">⭐ {p.google_rating}</span>
          <span className="text-xs text-slate-400 ml-auto">{timeAgo(p.latest_mention)}</span>
        </div>
        <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">&ldquo;{p.preview}&rdquo;</p>
        <button className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ background: color }}>
          View on Map →
        </button>
      </div>
    </div>
  );
}

/* ─── Card Style 2: Dark Vibe ─── */
function Card2({ p }: { p: typeof SAMPLE[0] }) {
  const color = CATEGORY_COLOR[p.category] || "#ff6b35";
  const total = p.sentiment.positive + p.sentiment.neutral + p.sentiment.negative;
  const posWidth = total ? Math.round((p.sentiment.positive / total) * 100) : 0;
  const negWidth = total ? Math.round((p.sentiment.negative / total) * 100) : 0;
  const neutWidth = 100 - posWidth - negWidth;
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow border border-slate-800">
      <div className="relative">
        <img src={p.photo_url} alt={p.name} className="w-full h-40 object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-base leading-tight">{p.name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{p.address}</p>
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
            🔥 {p.buzz}
          </span>
        </div>
      </div>
      <div className="p-3">
        {/* Sentiment bar */}
        <div className="flex rounded-full overflow-hidden h-1.5 mb-2">
          <div className="bg-emerald-500 transition-all" style={{ width: `${posWidth}%` }} />
          <div className="bg-amber-400 transition-all" style={{ width: `${neutWidth}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${negWidth}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
          <span>🟢 {p.sentiment.positive}</span>
          <span>🟡 {p.sentiment.neutral}</span>
          <span>🔴 {p.sentiment.negative}</span>
        </div>
        <p className="text-xs text-slate-400 italic line-clamp-1 mb-3">&ldquo;{p.preview}&rdquo;</p>
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            Map →
          </button>
          <button className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ background: color }}>
            Profile →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card Style 3: Horizontal Row ─── */
function Card3({ p }: { p: typeof SAMPLE[0] }) {
  const color = CATEGORY_COLOR[p.category] || "#ff6b35";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex overflow-hidden">
      <img src={p.photo_url} alt={p.name} className="w-24 h-full object-cover shrink-0" />
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-base">{CATEGORY_EMOJI[p.category]}</span>
            <h3 className="font-bold text-slate-900 text-sm truncate">{p.name}</h3>
          </div>
          <p className="text-[11px] text-slate-400 truncate mb-2">{p.address}</p>
          <p className="text-[11px] text-slate-500 italic line-clamp-2 leading-relaxed">&ldquo;{p.preview}&rdquo;</p>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "15", color }}>
            {p.mention_count} 💬
          </span>
          {p.google_rating && <span className="text-[11px] text-amber-500 font-medium">⭐ {p.google_rating}</span>}
          <span className="text-[11px] text-slate-400 ml-auto">{timeAgo(p.latest_mention)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Card Style 4: Bold Magazine ─── */
function Card4({ p }: { p: typeof SAMPLE[0] }) {
  const color = CATEGORY_COLOR[p.category] || "#ff6b35";
  return (
    <div className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow relative group">
      <img src={p.photo_url} alt={p.name} className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute top-3 left-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide" style={{ background: color }}>
          {p.category}
        </span>
      </div>
      <div className="absolute top-3 right-3">
        <span className="text-xs font-bold bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm">
          🔥 {p.buzz}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-black text-white text-base leading-tight mb-1">{p.name}</h3>
        <p className="text-white/70 text-xs mb-2">{p.address}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80">{p.mention_count} mentions · {timeAgo(p.latest_mention)}</span>
          {p.google_rating && <span className="text-xs text-amber-300 font-semibold ml-auto">⭐ {p.google_rating}</span>}
        </div>
        <p className="text-white/60 text-xs italic mt-1.5 line-clamp-1">&ldquo;{p.preview}&rdquo;</p>
      </div>
    </div>
  );
}

/* ─── Card Style 5: Compact Dense List ─── */
function Card5({ p, rank }: { p: typeof SAMPLE[0]; rank: number }) {
  const color = CATEGORY_COLOR[p.category] || "#ff6b35";
  const total = p.sentiment.positive + p.sentiment.neutral + p.sentiment.negative;
  const posWidth = total ? Math.round((p.sentiment.positive / total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#ff6b35]/30 hover:shadow-md transition-all flex items-center gap-3 px-4 py-3">
      <span className="text-slate-300 font-black text-xl w-6 text-center shrink-0">{rank}</span>
      <img src={p.photo_url} alt={p.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-slate-900 text-sm truncate">{p.name}</h3>
          <span className="shrink-0 text-sm">{CATEGORY_EMOJI[p.category]}</span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">{p.address}</p>
        {/* Mini sentiment bar */}
        <div className="flex rounded-full overflow-hidden h-1 mt-1.5 w-24">
          <div className="bg-emerald-400" style={{ width: `${posWidth}%` }} />
          <div className="bg-slate-200 flex-1" />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold px-2 py-0.5 rounded-full mb-1" style={{ background: color + "15", color }}>
          {p.mention_count} 💬
        </div>
        {p.google_rating && <div className="text-[11px] text-amber-500">⭐ {p.google_rating}</div>}
      </div>
    </div>
  );
}

const STYLES = [
  { id: 1, label: "Clean Minimal", desc: "Photo + stats, feels like a nice app card" },
  { id: 2, label: "Dark Vibe", desc: "Full-bleed photo, dark bg, sentiment bar" },
  { id: 3, label: "Horizontal Row", desc: "Compact side-photo layout, fits more per screen" },
  { id: 4, label: "Bold Magazine", desc: "Full image with gradient overlay, editorial feel" },
  { id: 5, label: "Compact List", desc: "Ranked dense rows, fastest to scan" },
];

export default function CardDemoPage() {
  const [active, setActive] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-slate-900">Card Styles</h1>
            <a href="/" className="text-xs text-[#ff6b35] font-medium">← Back</a>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  active === s.id
                    ? "bg-[#ff6b35] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s.id}. {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Style label */}
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-800">
            Style {active}: {STYLES[active - 1].label}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{STYLES[active - 1].desc}</p>
        </div>

        {/* Cards */}
        {active === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SAMPLE.map((p) => <Card1 key={p.id} p={p} />)}
          </div>
        )}
        {active === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SAMPLE.map((p) => <Card2 key={p.id} p={p} />)}
          </div>
        )}
        {active === 3 && (
          <div className="flex flex-col gap-3">
            {SAMPLE.map((p) => <Card3 key={p.id} p={p} />)}
          </div>
        )}
        {active === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SAMPLE.map((p) => <Card4 key={p.id} p={p} />)}
          </div>
        )}
        {active === 5 && (
          <div className="flex flex-col gap-2">
            {SAMPLE.map((p, i) => <Card5 key={p.id} p={p} rank={i + 1} />)}
          </div>
        )}
      </div>
    </div>
  );
}
