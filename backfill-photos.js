const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_64ErozpWTVNn@ep-mute-sound-aifuoc9x-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Curated Unsplash pools per category — varied so cards don't all look the same
const PHOTO_POOLS = {
  restaurant: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80",
    "https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=600&q=80",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&q=80",
    "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&q=80",
    "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80",
  ],
  bar: [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&q=80",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=600&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=600&q=80",
  ],
  cafe: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80",
    "https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=600&q=80",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80",
    "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80",
  ],
  park: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80",
    "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=600&q=80",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  ],
  shop: [
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80",
    "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=600&q=80",
    "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=600&q=80",
  ],
  venue: [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&q=80",
  ],
  club: [
    "https://images.unsplash.com/photo-1604549944282-7aeec7cbba28?w=600&q=80",
    "https://images.unsplash.com/photo-1571266028027-f0908c09f6b2?w=600&q=80",
    "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=600&q=80",
  ],
  gym: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&q=80",
    "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80",
  ],
  museum: [
    "https://images.unsplash.com/photo-1572953109940-f4427d9ef54f?w=600&q=80",
    "https://images.unsplash.com/photo-1565060169194-19fabf63012c?w=600&q=80",
    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&q=80",
  ],
  market: [
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80",
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&q=80",
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&q=80",
  ],
  other: [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80",
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80",
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600&q=80",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=80",
  ],
};

// Name-specific overrides for well-known Toronto places
const NAME_OVERRIDES = {
  "CN Tower": "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&q=80",
  "Kensington Market": "https://images.unsplash.com/photo-1597079910416-e08c3c2f7bb8?w=600&q=80",
  "Toronto Islands": "https://images.unsplash.com/photo-1589825743610-84e6c3d9e8f8?w=600&q=80",
  "The Keg": "https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80",
  "Shake Shack": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
  "Costco Food Court": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80",
  "Fairmont Royal York Hotel": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
  "Union Station": "https://images.unsplash.com/photo-1565623935988-2e866e5e2fe0?w=600&q=80",
  "Queen's Park": "https://images.unsplash.com/photo-1591642372433-15de4e2e5bfc?w=600&q=80",
};

async function run() {
  const rows = await sql`SELECT id, name, category FROM restaurants WHERE photo_url IS NULL OR photo_url = ''`;
  console.log(`Found ${rows.length} restaurants without photos`);

  // Track how many times each pool entry has been used per category
  const counters = {};

  let updated = 0;
  for (const r of rows) {
    // Check name override first
    let photoUrl = null;
    for (const [key, url] of Object.entries(NAME_OVERRIDES)) {
      if (r.name.toLowerCase().includes(key.toLowerCase())) {
        photoUrl = url;
        break;
      }
    }

    if (!photoUrl) {
      const pool = PHOTO_POOLS[r.category] || PHOTO_POOLS.other;
      const idx = (counters[r.category] || 0) % pool.length;
      counters[r.category] = (counters[r.category] || 0) + 1;
      photoUrl = pool[idx];
    }

    await sql`UPDATE restaurants SET photo_url = ${photoUrl} WHERE id = ${r.id}`;
    updated++;
    if (updated % 20 === 0) console.log(`Updated ${updated}/${rows.length}...`);
  }

  console.log(`Done! Updated ${updated} restaurants.`);
}

run().catch(console.error);
