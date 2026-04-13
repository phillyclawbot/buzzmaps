import Link from "next/link";
import TopBar from "@/components/ui/TopBar";

export default function AboutPage() {
  const sources = [
    "r/askTO",
    "r/toronto",
    "r/torontofood",
    "r/FoodToronto",
    "BlogTO",
    "Narcity",
    "Toronto Life",
    "NOW Magazine",
    "Eater Toronto",
  ];

  const steps = [
    "We scrape Reddit and the local press for mentions of Toronto places.",
    "An LLM extracts place names and figures out what kind of place each one is.",
    "Places are geocoded and surfaced — on the map, in collections, and in this feed.",
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="About" />

      <main className="pt-14 md:pt-16 pb-24">
        <article className="max-w-2xl mx-auto px-6 md:px-10 py-12 page-enter">
          {/* Hero */}
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Colophon
          </p>
          <h1
            className="font-display text-5xl md:text-6xl mb-6"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.05 }}
          >
            About BuzzMaps
          </h1>
          <p
            className="font-serif text-xl leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            BuzzMaps is a read-only love letter to Toronto, automatically
            assembled from what locals are actually saying — on Reddit, in
            BlogTO, in Toronto Life, in Eater. No reviews of our own. No paid
            placements. Just the city's collective mention count.
          </p>

          {/* How it works */}
          <section className="mt-16">
            <p className="eyebrow mb-3">The Method</p>
            <h2
              className="font-display text-3xl mb-8"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              How it's made
            </h2>
            <ol className="space-y-6">
              {steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-6 pb-6"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span
                    className="font-display text-3xl tabular-nums shrink-0"
                    style={{ color: "var(--fg-faint)", fontWeight: 400 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p
                    className="font-serif text-lg leading-relaxed"
                    style={{ color: "var(--fg)" }}
                  >
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Sources */}
          <section className="mt-16">
            <p className="eyebrow mb-3">The Wires</p>
            <h2
              className="font-display text-3xl mb-6"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Where we listen
            </h2>
            <div
              className="flex flex-wrap gap-x-5 gap-y-3 pb-6"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {sources.map((source) => (
                <span
                  key={source}
                  className="font-serif text-lg italic"
                  style={{ color: "var(--fg)" }}
                >
                  {source}
                </span>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="mt-16 text-center">
            <Link
              href="/"
              className="font-display text-2xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Start reading the feed →
            </Link>
            <p className="dateline mt-4">or</p>
            <Link
              href="/map"
              className="font-serif text-lg italic mt-2 inline-block"
              style={{ color: "var(--fg-muted)" }}
            >
              open the full map
            </Link>
          </section>
        </article>
      </main>
    </div>
  );
}
