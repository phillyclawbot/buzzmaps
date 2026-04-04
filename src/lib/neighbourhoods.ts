export interface Neighbourhood {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const NEIGHBOURHOODS: Neighbourhood[] = [
  { name: "Kensington Market",    minLat: 43.6515, maxLat: 43.6590, minLng: -79.4110, maxLng: -79.3950 },
  { name: "The Annex",            minLat: 43.6620, maxLat: 43.6750, minLng: -79.4160, maxLng: -79.3840 },
  { name: "Distillery District",  minLat: 43.6470, maxLat: 43.6545, minLng: -79.3640, maxLng: -79.3510 },
  { name: "Queen West",           minLat: 43.6410, maxLat: 43.6510, minLng: -79.4330, maxLng: -79.3850 },
  { name: "Leslieville",          minLat: 43.6540, maxLat: 43.6680, minLng: -79.3530, maxLng: -79.3100 },
  { name: "Yorkville",            minLat: 43.6680, maxLat: 43.6810, minLng: -79.4060, maxLng: -79.3810 },
  { name: "Liberty Village",      minLat: 43.6360, maxLat: 43.6460, minLng: -79.4350, maxLng: -79.4050 },
  { name: "Chinatown",            minLat: 43.6505, maxLat: 43.6580, minLng: -79.4040, maxLng: -79.3910 },
  { name: "Little Italy",         minLat: 43.6520, maxLat: 43.6640, minLng: -79.4260, maxLng: -79.4050 },
  { name: "Roncesvalles",         minLat: 43.6450, maxLat: 43.6630, minLng: -79.4530, maxLng: -79.4270 },
  { name: "The Beaches",          minLat: 43.6620, maxLat: 43.6820, minLng: -79.3120, maxLng: -79.2750 },
  { name: "Corktown",             minLat: 43.6490, maxLat: 43.6600, minLng: -79.3740, maxLng: -79.3570 },
  { name: "Waterfront",           minLat: 43.6330, maxLat: 43.6480, minLng: -79.4000, maxLng: -79.3570 },
  { name: "Financial District",   minLat: 43.6430, maxLat: 43.6540, minLng: -79.3900, maxLng: -79.3720 },
  { name: "West Queen West",      minLat: 43.6440, maxLat: 43.6510, minLng: -79.4340, maxLng: -79.4130 },
];

export function getNeighbourhood(lat: number, lng: number): string | null {
  for (const n of NEIGHBOURHOODS) {
    if (lat >= n.minLat && lat <= n.maxLat && lng >= n.minLng && lng <= n.maxLng) {
      return n.name;
    }
  }
  return null;
}

export function filterByNeighbourhood<T extends { lat: number; lng: number }>(
  items: T[],
  neighbourhood: string
): T[] {
  if (neighbourhood === "all") return items;
  const n = NEIGHBOURHOODS.find((nb) => nb.name === neighbourhood);
  if (!n) return items;
  return items.filter(
    (item) =>
      item.lat >= n.minLat &&
      item.lat <= n.maxLat &&
      item.lng >= n.minLng &&
      item.lng <= n.maxLng
  );
}
