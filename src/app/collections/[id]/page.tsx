import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import { getCollectionById } from "@/lib/collections";
import type { CollectionQuery } from "@/lib/collections";
import { isPublication } from "@/lib/constants";

export const dynamic = "force-dynamic";

function formatDate(utc: number): string {
  return new Date(utc * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const color =
    sentiment === "positive"
      ? "#22c55e"
      : sentiment === "negative"
      ? "#ef4444"
      : "#f59e0b";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ background: color }}
    />
  );
}

interface PlaceWithPosts {
  id: number;
  name: string;
  category: PlaceCategory;
  mention_count: number;
  google_rating: number | null;
  address: string | null;
  posts: {
    id: number;
    title: string;
    subreddit: string;
    score: number;
    num_comments: number;
    permalink: string;
    sentiment: string;
    created_utc: number;
  }[];
}

async function fetchCollectionPlacesWithPosts(
  sql: ReturnType<typeof getDb>,
  query: CollectionQuery
): Promise<PlaceWithPosts[]> {
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  );

  const postsAgg = `json_agg(json_build_object(
    'id', rp.id,
    'title', rp.title,
    'subreddit', rp.subreddit,
    'score', rp.score,
    'num_comments', rp.num_comments,
    'permalink', rp.permalink,
    'sentiment', pr.sentiment,
    'created_utc', rp.created_utc
  ) ORDER BY rp.created_utc DESC)`;

  if (query.type === "name_or_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.name ILIKE ${term} OR rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "category") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "category_and_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category} AND rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "recent") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc > ${thirtyDaysAgo}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY MAX(rp.created_utc) DESC
      LIMIT 20
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "top_by_mention") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT ${query.limit}
    `;
    return rows as PlaceWithPosts[];
  }

  return [];
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) notFound();

  const sql = getDb();
  const places = await fetchCollectionPlacesWithPosts(sql, collection.query);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-10 h-12 flex items-center px-4 gap-3">
        <Link
          href="/collections"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#ff6b35] transition-colors font-medium"
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
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Collections
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </div>
      </div>

      {/* Collection header */}
      <div className="bg-gradient-to-br from-[#ff6b35]/10 to-[#f59e0b]/5 border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            <span className="text-5xl leading-none">{collection.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {collection.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {collection.description}
              </p>
              <span className="inline-block mt-2 text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2.5 py-1 rounded-full">
                {places.length} place{places.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Places list */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 page-enter">
        {places.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No places found in this collection yet.
          </div>
        ) : (
          <div className="space-y-4">
            {places.map((place, i) => {
              const posts = (place.posts ?? []).filter((p) => p.id !== null);
              return (
                <div
                  key={place.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Place header */}
                  <div className="px-5 py-4 flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-6 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-2xl leading-none shrink-0">
                      {CATEGORY_EMOJI[place.category] || "\u{1F4CD}"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/place/${encodeURIComponent(place.name)}`}
                        className="text-base font-bold text-slate-900 hover:text-[#ff6b35] transition-colors"
                      >
                        {place.name}
                      </Link>
                      {place.address && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {place.address}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {place.google_rating && (
                        <span className="text-xs text-slate-500">
                          ⭐ {place.google_rating.toFixed(1)}
                        </span>
                      )}
                      <span className="text-xs text-[#ff6b35] font-bold bg-[#ff6b35]/10 px-2 py-1 rounded-full">
                        {place.mention_count} 💬
                      </span>
                    </div>
                  </div>

                  {/* Mentions */}
                  {posts.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-3 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mentions
                      </p>
                      {posts.map((post) => {
                        const isPub = isPublication(post.subreddit);
                        return (
                        <a
                          key={post.id}
                          href={isPub ? post.permalink : `https://reddit.com${post.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2.5 group"
                        >
                          <SentimentDot sentiment={post.sentiment} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 group-hover:text-[#ff6b35] transition-colors line-clamp-1">
                              {post.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isPub ? (
                                <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-500 rounded font-medium">
                                  📰 {post.subreddit}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#ff6b35]/80 font-medium">
                                  r/{post.subreddit}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                ↑{post.score}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {post.num_comments} comments
                              </span>
                              <span className="text-[10px] text-slate-400 ml-auto">
                                {formatDate(post.created_utc)}
                              </span>
                            </div>
                          </div>
                          <svg
                            className="text-slate-300 group-hover:text-[#ff6b35] transition-colors shrink-0 mt-0.5"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
