/**
 * Single source of truth for how a "post" surfaces its origin in the UI.
 *
 * Reddit posts and publication scrapes both land in the `reddit_posts`
 * table (legacy schema) under the `subreddit` column — but a real subreddit
 * (`torontobiking`, `askTO`) wants the `r/` prefix and a `reddit.com` link,
 * while a publication (`BlogTO`, `Toronto Sun`, `Eater Toronto`, ticket
 * vendors) wants the bare name and links straight to the original article.
 *
 * Every place in the UI that renders a post source MUST go through these
 * helpers. Don't write `r/${post.subreddit}` anywhere else.
 *
 * Uses `isPublication` / `isTicketingSource` from constants for membership.
 */

import { isPublication, isTicketingSource } from "./constants";

export type SourceKind = "subreddit" | "publication" | "ticketing";

export interface PostSourceInfo {
  kind: SourceKind;
  /** Display label, e.g. "r/torontobiking", "BlogTO", "Ticketmaster". */
  label: string;
  /** Bare name with no prefix, e.g. "torontobiking", "BlogTO". */
  name: string;
  /** True if this is a real subreddit (gets r/ prefix). */
  isSubreddit: boolean;
}

export function getPostSource(subreddit: string): PostSourceInfo {
  if (isTicketingSource(subreddit)) {
    return {
      kind: "ticketing",
      label: subreddit,
      name: subreddit,
      isSubreddit: false,
    };
  }
  if (isPublication(subreddit)) {
    return {
      kind: "publication",
      label: subreddit,
      name: subreddit,
      isSubreddit: false,
    };
  }
  return {
    kind: "subreddit",
    label: `r/${subreddit}`,
    name: subreddit,
    isSubreddit: true,
  };
}

/**
 * Resolve the correct outbound href for a post. For a publication, the
 * `permalink` column already holds the full https:// URL. For a real
 * subreddit, we prepend reddit.com.
 */
export function getPostHref(subreddit: string, permalink: string): string {
  const src = getPostSource(subreddit);
  if (src.isSubreddit) return `https://reddit.com${permalink}`;
  // Publications and ticketing sources store full URLs in permalink.
  return permalink;
}

// ─────────────────────────────────────────────────────────────────────────
// HTML entity decoding
// ─────────────────────────────────────────────────────────────────────────
// Reddit's API returns titles with HTML entities encoded
// (`Trump&#8217;s`, `&amp;`, `&quot;`, etc.). We render plain text, so
// those entities show up as literal `&#8217;` strings on the page.
//
// Decoding only the common entities Reddit emits — no DOMParser needed
// (server-component safe).

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "\u2026",
  laquo: "\u00ab",
  raquo: "\u00bb",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
};

/**
 * Decode HTML entities in a string. Handles named entities (&amp;),
 * decimal numeric (&#8217;), and hex numeric (&#x27;) references.
 *
 * Safe to run server-side — pure string manipulation, no DOM.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  return input.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g,
    (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        const code = parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (entity.startsWith("#")) {
        const code = parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[entity] ?? match;
    }
  );
}
