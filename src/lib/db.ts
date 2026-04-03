import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export async function runMigrations() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS subreddits (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      last_scraped_at TIMESTAMPTZ,
      city TEXT DEFAULT 'toronto'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reddit_posts (
      id SERIAL PRIMARY KEY,
      reddit_id TEXT UNIQUE NOT NULL,
      subreddit TEXT NOT NULL,
      title TEXT NOT NULL,
      selftext TEXT,
      author TEXT,
      url TEXT NOT NULL,
      permalink TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      num_comments INTEGER DEFAULT 0,
      is_food_related BOOLEAN DEFAULT false,
      sentiment TEXT DEFAULT 'neutral',
      created_utc BIGINT NOT NULL,
      scraped_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS restaurants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      place_id TEXT UNIQUE,
      address TEXT,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      google_rating DOUBLE PRECISION,
      google_reviews_count INTEGER,
      cuisine_type TEXT,
      price_level INTEGER,
      photo_reference TEXT,
      first_seen_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS post_restaurants (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES reddit_posts(id) ON DELETE CASCADE,
      restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
      mention_context TEXT,
      sentiment TEXT DEFAULT 'neutral',
      UNIQUE(post_id, restaurant_id)
    )
  `;

  await sql`
    INSERT INTO subreddits (name, city) VALUES
      ('askTO', 'toronto'),
      ('toronto', 'toronto'),
      ('torontofood', 'toronto'),
      ('FoodToronto', 'toronto')
    ON CONFLICT DO NOTHING
  `;
}
