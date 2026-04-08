import { getDb } from "@/lib/db";
import { isInToronto, delay } from "@/lib/utils";

export const maxDuration = 120;

interface EventResult {
  id: string;
  name: string;
  venue: string;
  address: string;
  lat: number;
  lng: number;
  date: string;
  endDate?: string;
  ticketUrl: string;
  imageUrl?: string;
  genre?: string;
  priceRange?: string;
  source: "eventbrite" | "ticketmaster";
}

async function fetchEventbriteEvents(): Promise<EventResult[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;
  if (!apiKey) return [];

  const events: EventResult[] = [];

  try {
    for (let page = 1; page <= 3; page++) {
      const params = new URLSearchParams({
        "location.address": "Toronto, Ontario, Canada",
        "location.within": "30km",
        expand: "venue",
        page: String(page),
      });

      const res = await fetch(
        `https://www.eventbriteapi.com/v3/events/search/?${params}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!res.ok) break;
      const data = await res.json();
      const pageEvents = data.events || [];

      for (const ev of pageEvents) {
        const venue = ev.venue;
        if (!venue) continue;

        const lat = parseFloat(venue.latitude || "0");
        const lng = parseFloat(venue.longitude || "0");
        if (!lat || !lng || !isInToronto(lat, lng)) continue;

        events.push({
          id: `eb_${ev.id}`,
          name: ev.name?.text || "Untitled Event",
          venue: venue.name || "Unknown Venue",
          address: venue.address?.localized_address_display || venue.address?.address_1 || "Toronto, ON",
          lat,
          lng,
          date: ev.start?.local || "",
          endDate: ev.end?.local || undefined,
          ticketUrl: ev.url || "",
          imageUrl: ev.logo?.url || undefined,
          source: "eventbrite",
        });
      }

      if (!data.pagination?.has_more_items) break;
      await delay(500);
    }
  } catch (err) {
    console.error("Eventbrite fetch error:", err);
  }

  return events;
}

async function fetchTicketmasterEvents(): Promise<EventResult[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  const events: EventResult[] = [];
  const now = new Date().toISOString().split(".")[0] + "Z";

  try {
    for (let page = 0; page < 5; page++) {
      const params = new URLSearchParams({
        city: "Toronto",
        countryCode: "CA",
        size: "50",
        page: String(page),
        sort: "date,asc",
        startDateTime: now,
        apikey: apiKey,
      });

      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        { signal: AbortSignal.timeout(15000) }
      );

      if (!res.ok) break;
      const data = await res.json();
      const embedded = data._embedded?.events || [];

      for (const ev of embedded) {
        const venue = ev._embedded?.venues?.[0];
        if (!venue) continue;

        const lat = parseFloat(venue.location?.latitude || "0");
        const lng = parseFloat(venue.location?.longitude || "0");
        if (!lat || !lng || !isInToronto(lat, lng)) continue;

        const startDate = ev.dates?.start?.localDate || "";
        const startTime = ev.dates?.start?.localTime || "";

        // Pick best 16:9 image (prefer wider)
        const images = ev.images || [];
        const best = images
          .filter((img: { ratio?: string; width: number }) => img.ratio === "16_9")
          .sort((a: { width: number }, b: { width: number }) => b.width - a.width)[0];
        const imageUrl = best?.url || images[0]?.url || undefined;

        // Genre info
        const genre = ev.classifications?.[0]?.genre?.name;
        const segment = ev.classifications?.[0]?.segment?.name;
        const genreLabel = genre && genre !== "Undefined" ? genre : segment || undefined;

        // Price range
        const prices = ev.priceRanges?.[0];
        const priceRange = prices
          ? `$${Math.round(prices.min)}–$${Math.round(prices.max)} ${prices.currency}`
          : undefined;

        events.push({
          id: `tm_${ev.id}`,
          name: ev.name || "Untitled Event",
          venue: venue.name || "Unknown Venue",
          address: venue.address?.line1
            ? `${venue.address.line1}, ${venue.city?.name || "Toronto"}`
            : venue.city?.name || "Toronto, ON",
          lat,
          lng,
          date: startTime ? `${startDate}T${startTime}` : startDate,
          endDate: ev.dates?.end?.localDate || undefined,
          ticketUrl: ev.url || "",
          imageUrl,
          genre: genreLabel,
          priceRange,
          source: "ticketmaster",
        });
      }

      const nextLink = data._links?.next;
      if (!nextLink) break;
      await delay(300);
    }
  } catch (err) {
    console.error("Ticketmaster fetch error:", err);
  }

  return events;
}

async function saveEvents(events: EventResult[]): Promise<number> {
  if (events.length === 0) return 0;

  const sql = getDb();
  let saved = 0;

  for (const ev of events) {
    try {
      const metadata = JSON.stringify({
        event_date: ev.date,
        ...(ev.endDate && { event_end_date: ev.endDate }),
        ticket_url: ev.ticketUrl,
        venue_name: ev.venue,
        ...(ev.genre && { genre: ev.genre }),
        ...(ev.priceRange && { price_range: ev.priceRange }),
      });

      // Upsert the restaurant/place
      const rows = await sql`
        INSERT INTO restaurants (name, place_id, address, lat, lng, category, metadata, photo_url)
        VALUES (${ev.name}, ${ev.id}, ${ev.address}, ${ev.lat}, ${ev.lng}, 'event', ${metadata}::jsonb, ${ev.imageUrl || null})
        ON CONFLICT (place_id) DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          category = 'event',
          metadata = EXCLUDED.metadata,
          photo_url = COALESCE(EXCLUDED.photo_url, restaurants.photo_url)
        RETURNING id
      `;

      const restaurantId = rows[0].id;

      // Create a synthetic post for the event
      const titleText = `${ev.name} at ${ev.venue}`;
      const subreddit = ev.source === "eventbrite" ? "Eventbrite" : "Ticketmaster";
      const redditId = ev.id;

      const postRows = await sql`
        INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
        VALUES (
          ${redditId},
          ${subreddit},
          ${titleText},
          ${`Event: ${ev.name}. Venue: ${ev.venue}. Date: ${ev.date}.${ev.genre ? ` Genre: ${ev.genre}.` : ""}${ev.priceRange ? ` Price: ${ev.priceRange}.` : ""}`},
          ${subreddit},
          ${ev.ticketUrl || "https://buzzmaps.vercel.app"},
          ${ev.ticketUrl || "/events"},
          5,
          0,
          false,
          'positive',
          ${Math.floor(Date.now() / 1000)}
        )
        ON CONFLICT (reddit_id) DO UPDATE SET
          title = EXCLUDED.title,
          url = EXCLUDED.url,
          selftext = EXCLUDED.selftext
        RETURNING id
      `;

      if (postRows.length > 0) {
        await sql`
          INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
          VALUES (${postRows[0].id}, ${restaurantId}, ${`${ev.name} — ${ev.date}`}, 'positive')
          ON CONFLICT (post_id, restaurant_id) DO NOTHING
        `;
      }

      saved++;
    } catch (err) {
      console.error(`Failed to save event ${ev.name}:`, err);
    }
  }

  return saved;
}

export async function GET() {
  try {
    // Fetch from both sources in parallel
    const [eventbriteEvents, ticketmasterEvents] = await Promise.all([
      fetchEventbriteEvents(),
      fetchTicketmasterEvents(),
    ]);

    const allEvents = [...eventbriteEvents, ...ticketmasterEvents];
    const saved = await saveEvents(allEvents);

    return Response.json({
      eventbrite: eventbriteEvents.length,
      ticketmaster: ticketmasterEvents.length,
      total_fetched: allEvents.length,
      places_found: saved,
    });
  } catch (err) {
    console.error("Events scrape error:", err);
    return Response.json({ error: "Failed to scrape events" }, { status: 500 });
  }
}
