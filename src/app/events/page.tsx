import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import TopBar from "@/components/ui/TopBar";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Events — ${SITE_NAME} Toronto`,
  description:
    "What's on in Toronto this week and beyond — events, shows, and listings pulled from Ticketmaster, Eventbrite, and local publications.",
  alternates: { canonical: `${SITE_URL}/events` },
  openGraph: {
    title: `Events — ${SITE_NAME} Toronto`,
    description: "What's on in Toronto — events, shows, listings.",
    url: `${SITE_URL}/events`,
    type: "website",
  },
};

interface EventRow {
  id: number;
  name: string;
  address: string | null;
  metadata: {
    event_date?: string;
    event_end_date?: string;
    venue_name?: string;
    genre?: string;
    ticket_url?: string;
    price_range?: string;
  } | null;
  mention_count: number;
  photo_url: string | null;
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd.getTime() - today.getTime()) / 86400000);
  const weekday = d.toLocaleDateString("en-CA", { weekday: "long" });
  const date = d.toLocaleDateString("en-CA", { month: "long", day: "numeric" });
  if (diff === 0) return `Today · ${weekday}, ${date}`;
  if (diff === 1) return `Tomorrow · ${weekday}, ${date}`;
  return `${weekday}, ${date}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

function groupByDay(events: EventRow[]): Record<string, EventRow[]> {
  const groups: Record<string, EventRow[]> = {};
  for (const ev of events) {
    const raw = ev.metadata?.event_date;
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;
    const dayKey = d.toISOString().slice(0, 10);
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(ev);
  }
  // Sort events within each day by time
  for (const key in groups) {
    groups[key].sort((a, b) => {
      const ad = new Date(a.metadata?.event_date ?? 0).getTime();
      const bd = new Date(b.metadata?.event_date ?? 0).getTime();
      return ad - bd;
    });
  }
  return groups;
}

export default async function EventsPage() {
  let events: EventRow[] = [];
  try {
    const sql = getDb();
    const nowIso = new Date().toISOString();
    events = (await sql`
      SELECT r.id, r.name, r.address, r.metadata, r.photo_url,
        COALESCE(
          (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id),
          0
        ) as mention_count
      FROM restaurants r
      WHERE r.category = 'event'
        AND r.metadata ? 'event_date'
        AND (r.metadata->>'event_date') >= ${nowIso}
      ORDER BY (r.metadata->>'event_date')::timestamptz ASC
      LIMIT 200
    `) as EventRow[];
  } catch (err) {
    console.error("[events] query failed:", err);
  }

  const byDay = groupByDay(events);
  const sortedDays = Object.keys(byDay).sort();
  const totalEvents = events.length;

  // Simple genre tag frequency for the sidebar chip row
  const genreFreq = new Map<string, number>();
  for (const ev of events) {
    const g = ev.metadata?.genre;
    if (g) genreFreq.set(g, (genreFreq.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Events" />

      <article className="pt-14 md:pt-16 pb-24 max-w-4xl mx-auto px-6 md:px-10 page-enter">
        <header
          className="text-center pt-10 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            The Calendar
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            What's on.
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Upcoming shows, listings and gatherings across Toronto — sourced
            from Ticketmaster, Eventbrite, and the local press.
          </p>
          <p className="dateline mt-6">
            {totalEvents} upcoming {totalEvents === 1 ? "event" : "events"}
          </p>
        </header>

        {topGenres.length > 0 && (
          <div className="mb-10">
            <p className="eyebrow mb-3">Popular</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {topGenres.map(([genre, count]) => (
                <span
                  key={genre}
                  className="font-serif italic text-base"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {genre}{" "}
                  <span className="dateline" style={{ color: "var(--fg-subtle)" }}>
                    ({count})
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {sortedDays.length === 0 ? (
          <div className="text-center py-20">
            <h2
              className="font-display text-3xl md:text-4xl mb-3"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              A quiet calendar.
            </h2>
            <p
              className="caption max-w-sm mx-auto mb-8"
              style={{ color: "var(--fg-muted)" }}
            >
              We don't have any upcoming events in the index right now. Check
              the Dispatch for weekly highlights.
            </p>
            <Link
              href="/digest"
              className="font-display text-xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Read the Dispatch →
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {sortedDays.map((day) => {
              const dayEvents = byDay[day];
              return (
                <section key={day}>
                  <div
                    className="flex items-baseline justify-between pb-3 mb-5"
                    style={{ borderBottom: "1px solid var(--fg)" }}
                  >
                    <h2
                      className="font-display text-2xl md:text-3xl"
                      style={{ color: "var(--fg)", fontWeight: 500 }}
                    >
                      {formatDayHeader(day + "T12:00:00Z")}
                    </h2>
                    <p className="dateline">
                      {dayEvents.length}{" "}
                      {dayEvents.length === 1 ? "event" : "events"}
                    </p>
                  </div>
                  <ul>
                    {dayEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-baseline gap-5 py-5"
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <span
                          className="font-mono shrink-0 w-16 tabular-nums"
                          style={{
                            color: "var(--fg-muted)",
                            fontSize: 12,
                          }}
                        >
                          {ev.metadata?.event_date
                            ? formatTime(ev.metadata.event_date)
                            : "—"}
                        </span>
                        <div className="flex-1 min-w-0">
                          {ev.metadata?.genre && (
                            <p
                              className="eyebrow mb-1"
                              style={{ color: "var(--brand)" }}
                            >
                              {ev.metadata.genre}
                            </p>
                          )}
                          <Link
                            href={`/place/${encodeURIComponent(ev.name)}`}
                            className="font-display text-xl md:text-2xl ink-underline inline"
                            style={{
                              color: "var(--fg)",
                              fontWeight: 500,
                              lineHeight: 1.15,
                            }}
                          >
                            {ev.name}
                          </Link>
                          <p
                            className="caption mt-2"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            {ev.metadata?.venue_name ??
                              ev.address ??
                              "Venue TBA"}
                            {ev.metadata?.price_range && (
                              <> · {ev.metadata.price_range}</>
                            )}
                          </p>
                        </div>
                        {ev.metadata?.ticket_url && (
                          <a
                            href={ev.metadata.ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="eyebrow shrink-0 hover:text-[color:var(--brand)] transition-colors"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            Tickets →
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <footer
          className="mt-20 pt-8 text-center"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="dateline">
            BuzzMaps · Toronto · Calendar refreshes every 10 minutes
          </p>
        </footer>
      </article>
    </div>
  );
}
