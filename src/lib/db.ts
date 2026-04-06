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
      photo_url TEXT,
      first_seen_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Migrate existing databases: rename photo_reference → photo_url
  await sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'photo_reference'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'photo_url'
      ) THEN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'restaurants' AND column_name = 'photo_url'
        ) THEN
          ALTER TABLE restaurants RENAME COLUMN photo_reference TO photo_url;
        END IF;
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS post_restaurants (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES reddit_posts(id) ON DELETE CASCADE,
      restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
      mention_context TEXT,
      sentiment TEXT DEFAULT 'neutral',
      mentions_in_thread INTEGER DEFAULT 1,
      UNIQUE(post_id, restaurant_id)
    )
  `;

  // Migrate: add category + metadata columns to restaurants if missing
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'category'
      ) THEN
        ALTER TABLE restaurants ADD COLUMN category TEXT;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'metadata'
      ) THEN
        ALTER TABLE restaurants ADD COLUMN metadata JSONB;
      END IF;
    END $$
  `;

  // Migrate: add mentions_in_thread to post_restaurants if missing
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'post_restaurants' AND column_name = 'mentions_in_thread'
      ) THEN
        ALTER TABLE post_restaurants ADD COLUMN mentions_in_thread INTEGER DEFAULT 1;
      END IF;
    END $$
  `;

  await sql`
    INSERT INTO subreddits (name, city) VALUES
      ('askTO', 'toronto'),
      ('toronto', 'toronto'),
      ('torontofood', 'toronto'),
      ('FoodToronto', 'toronto'),
      ('askToronto', 'toronto'),
      ('torontoevents', 'toronto'),
      ('torontobiking', 'toronto')
    ON CONFLICT DO NOTHING
  `;
}
