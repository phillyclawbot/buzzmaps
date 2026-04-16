import { categoryColor, categoryColorDark, CategoryGlyphMark } from "@/lib/icons";

/**
 * Teardrop map pin with a category glyph inside.
 * Renders as pure SVG so it can be used both in React and as the `html`
 * of a Leaflet divIcon (via renderToStaticMarkup elsewhere).
 */
export function TeardropPin({
  category,
  size = 40,
  glow = true,
  bounce = false,
  iconSize,
  ariaLabel,
}: {
  category: string;
  size?: number;
  glow?: boolean;
  bounce?: boolean;
  iconSize?: number;
  ariaLabel?: string;
}) {
  const c = categoryColor(category);
  const cd = categoryColorDark(category);
  const glyphSize = iconSize ?? Math.round(size * 0.42);
  const id = `pin-g-${category}-${size}`;

  return (
    <span
      className={bounce ? "pin-drop" : ""}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size * 1.2,
        filter: glow ? "drop-shadow(0 6px 10px rgba(15,20,25,0.25))" : undefined,
      }}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 40 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c} />
            <stop offset="100%" stopColor={cd} />
          </linearGradient>
        </defs>
        {/* Teardrop body */}
        <path
          d="M20 1.5C10.6 1.5 3 9 3 18.3c0 11.8 12.5 24.2 15.8 27.2a1.8 1.8 0 0 0 2.4 0C24.5 42.5 37 30.1 37 18.3 37 9 29.4 1.5 20 1.5z"
          fill={`url(#${id})`}
          stroke="#ffffff"
          strokeWidth="1.6"
        />
        {/* Inner white circle (icon base) */}
        <circle cx="20" cy="18" r="9" fill="#ffffff" />
      </svg>
      {/* Glyph */}
      <span
        style={{
          position: "absolute",
          top: `${(size * 1.2 * 0.375) - glyphSize / 2}px`,
          left: `${(size - glyphSize) / 2}px`,
          width: glyphSize,
          height: glyphSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CategoryGlyphMark category={category} size={glyphSize} color={c} />
      </span>
    </span>
  );
}

/**
 * Circular photo pin (Airbnb-style) — used for high-mention places
 * that have a photo. Colored ring uses the category color.
 */
export function PhotoPin({
  category,
  photoUrl,
  size = 44,
  bounce = false,
  ariaLabel,
}: {
  category: string;
  photoUrl: string;
  size?: number;
  bounce?: boolean;
  ariaLabel?: string;
}) {
  const c = categoryColor(category);
  return (
    <span
      className={bounce ? "pin-drop" : ""}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 9999,
        padding: 2,
        background: c,
        boxShadow: "0 6px 14px rgba(15,20,25,.22), 0 2px 4px rgba(15,20,25,.14)",
      }}
      aria-label={ariaLabel}
    >
      <span
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          borderRadius: 9999,
          background: "#fff",
          padding: 2,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          width={size - 8}
          height={size - 8}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 9999,
            display: "block",
          }}
        />
      </span>
      {/* Pointer tail */}
      <span
        style={{
          position: "absolute",
          bottom: -4,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          width: 10,
          height: 10,
          background: c,
          borderRadius: 1,
          boxShadow: "0 2px 3px rgba(15,20,25,.15)",
          zIndex: -1,
        }}
      />
    </span>
  );
}
