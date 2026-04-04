const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_64ErozpWTVNn@ep-mute-sound-aifuoc9x-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require');
const GOOGLE_KEY = 'AIzaSyBidzxi-ixV8lEkeWtPDyx9bJQwjJw5MYc';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getGooglePhoto(name, address) {
  const query = encodeURIComponent(`${name} ${address || 'Toronto'}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.status !== 'OK' || !data.results?.[0]) return null;
  
  const place = data.results[0];
  if (!place.photos?.[0]?.photo_reference) return null;
  
  const ref = place.photos[0].photo_reference;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${ref}&key=${GOOGLE_KEY}`;
}

async function run() {
  const rows = await sql`SELECT id, name, address, category FROM restaurants ORDER BY id`;
  console.log(`Processing ${rows.length} restaurants...`);
  
  let updated = 0, failed = 0;
  
  for (const r of rows) {
    try {
      const photoUrl = await getGooglePhoto(r.name, r.address);
      if (photoUrl) {
        await sql`UPDATE restaurants SET photo_url = ${photoUrl} WHERE id = ${r.id}`;
        updated++;
        process.stdout.write(`✓ ${r.name}\n`);
      } else {
        failed++;
        process.stdout.write(`✗ ${r.name} (no photo)\n`);
      }
      // Stay under API rate limits
      await sleep(150);
    } catch (e) {
      failed++;
      console.error(`Error for ${r.name}:`, e.message);
      await sleep(300);
    }
    
    if ((updated + failed) % 25 === 0) {
      console.log(`\n--- Progress: ${updated} updated, ${failed} failed ---\n`);
    }
  }
  
  console.log(`\nDone! ${updated} updated, ${failed} failed.`);
}

run().catch(console.error);
