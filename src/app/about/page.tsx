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
    { num: 1, text: "We scrape Reddit + publications for mentions of Toronto places" },
    { num: 2, text: "AI extracts place names and figures out what kind of place it is" },
    { num: 3, text: "Places are geocoded and mapped so you can explore them visually" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="About" />

      <div className="pt-12 md:pt-14 max-w-2xl mx-auto px-4 py-12 pb-20 page-enter">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--fg)" }}>
            About BuzzMaps
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            BuzzMaps aggregates mentions of Toronto places from Reddit, BlogTO, Narcity,
            Toronto Life, and other local sources. Find where locals actually go.
          </p>
        </div>

        {/* Sources */}
        <div className="app-card p-6 mb-6">
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            Sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => (
              <span
                key={source}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
              >
                {source}
              </span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="app-card p-6 mb-8">
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--fg-muted)" }}
          >
            How it works
          </h2>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, var(--brand), var(--brand-hover))",
                    color: "var(--fg-inverse)",
                  }}
                >
                  {step.num}
                </div>
                <p
                  className="text-sm leading-relaxed pt-1.5"
                  style={{ color: "var(--fg)" }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity press-down"
          style={{
            backgroundImage: "linear-gradient(135deg, var(--brand), var(--brand-hover))",
            color: "var(--fg-inverse)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Explore the map
        </Link>
      </div>
    </div>
  );
}
