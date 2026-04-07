import type { PlaceCategory } from "@/lib/types";

// Shared SVG icon components — no emojis, clean vector graphics

export function IconStar({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function IconChat({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconShare({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export function IconMap({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function IconExternalLink({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

export function IconGrid({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function IconPin({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconNewspaper({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
    </svg>
  );
}

export function IconUpArrow({ size = 10, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

// SVG icons for collection themes — replaces emoji
const COLLECTION_ICONS: Record<string, (props: { size?: number; className?: string }) => React.ReactElement> = {
  buzzing: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ff6b35" opacity="0.2" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  coffee: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 1v3M10 1v3M14 1v3" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  parks: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 22V8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12l7-10 7 10H5z" fill="#22c55e" opacity="0.15" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 17l5-7 5 7H7z" fill="#22c55e" opacity="0.25" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  bars: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 22H16" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17V22" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 2L6 7C6 12 12 12 12 17C12 12 18 12 18 7V2H6Z" fill="#a855f7" opacity="0.15" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  shops: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z" fill="#06b6d4" opacity="0.1" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7h18" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 11a4 4 0 01-8 0" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  kensington: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9,22 9,12 15,12 15,22" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  danforth: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 8h1a4 4 0 010 8h-1" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" fill="#ef4444" opacity="0.1" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 1v3M10 1v3M14 1v3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  chinatown: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C9 7 4 9 4 14a8 8 0 0016 0c0-5-5-7-8-12z" fill="#dc2626" opacity="0.12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "little-italy": ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#16a34a" opacity="0.1" stroke="#16a34a" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  ramen: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12h18" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12v4a7 7 0 0014 0v-4" fill="#f97316" opacity="0.1" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 5c0 2 2 3 2 5M12 4c0 2 2 3 2 5M17 5c0 2 2 3 2 5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  museums: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2 20h20M4 20V10M20 20V10M12 4L2 10h20L12 4z" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 14v4M12 14v4M16 14v4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export function CollectionIcon({ id, size = 24, className = "" }: { id: string; size?: number; className?: string }) {
  const Icon = COLLECTION_ICONS[id];
  if (Icon) return <Icon size={size} className={className} />;
  // Fallback
  return <IconGrid size={size} className={className} />;
}

// Category icon SVGs for collection context (replacing CATEGORY_EMOJI)
const CATEGORY_ICON_SVGS: Record<string, (props: { size?: number; className?: string }) => React.ReactElement> = {
  restaurant: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  ),
  bar: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 22h8M12 17v5M2 2l10 10 10-10H2z" />
    </svg>
  ),
  cafe: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  club: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  shop: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6zM3 7h18M16 11a4 4 0 01-8 0" />
    </svg>
  ),
  park: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22V8M5 12l7-10 7 10H5zM7 17l5-7 5 7H7z" />
    </svg>
  ),
  gym: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="M6 5v14M18 5v14M6 12h12M2 8v8M22 8v8" />
    </svg>
  ),
  venue: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 16.1A5 5 0 0 1 5.9 20M9.9 20a5 5 0 0 1 3.9-3.9M15.8 20a5 5 0 0 1 3.9-3.9" />
      <path d="M2 12.05A9 9 0 0 1 9.9 16M16 16a9 9 0 0 1 5.95-8.05" />
      <path d="M2 8a13 13 0 0 1 20 0" />
    </svg>
  ),
  market: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  ),
  museum: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 20h20M4 20V10M20 20V10M12 4L2 10h20L12 4zM8 14v4M12 14v4M16 14v4" />
    </svg>
  ),
  event: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  landmark: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 20h20M4 20V10M20 20V10M12 4L2 10h20L12 4zM8 14v4M12 14v4M16 14v4" />
    </svg>
  ),
  attraction: ({ size = 16, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20M2 12h20" />
    </svg>
  ),
  other: ({ size = 16, className = "" }) => (
    <IconPin size={size} className={className} />
  ),
};

export function CategoryIcon({ category, size = 16, className = "" }: { category: string; size?: number; className?: string }) {
  const Icon = CATEGORY_ICON_SVGS[category] || CATEGORY_ICON_SVGS.other;
  return <Icon size={size} className={className} />;
}
