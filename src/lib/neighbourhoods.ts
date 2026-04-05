export interface Neighbourhood {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const NEIGHBOURHOODS: Neighbourhood[] = [
  // West End
  { name: "The Junction",         minLat: 43.6600, maxLat: 43.6740, minLng: -79.4700, maxLng: -79.4440 },
  { name: "Junction Triangle",    minLat: 43.6570, maxLat: 43.6650, minLng: -79.4580, maxLng: -79.4370 },
  { name: "Bloor West Village",   minLat: 43.6470, maxLat: 43.6620, minLng: -79.4940, maxLng: -79.4680 },
  { name: "High Park",            minLat: 43.6380, maxLat: 43.6600, minLng: -79.4750, maxLng: -79.4480 },
  { name: "Roncesvalles",         minLat: 43.6450, maxLat: 43.6630, minLng: -79.4530, maxLng: -79.4270 },
  { name: "Parkdale",             minLat: 43.6350, maxLat: 43.6470, minLng: -79.4530, maxLng: -79.4260 },
  { name: "Liberty Village",      minLat: 43.6360, maxLat: 43.6460, minLng: -79.4350, maxLng: -79.4050 },
  // West-Central
  { name: "West Queen West",      minLat: 43.6440, maxLat: 43.6510, minLng: -79.4340, maxLng: -79.4130 },
  { name: "Queen West",           minLat: 43.6410, maxLat: 43.6510, minLng: -79.4130, maxLng: -79.3850 },
  { name: "Ossington",            minLat: 43.6460, maxLat: 43.6600, minLng: -79.4280, maxLng: -79.4120 },
  { name: "Dundas West",          minLat: 43.6480, maxLat: 43.6580, minLng: -79.4440, maxLng: -79.4200 },
  { name: "Little Italy",         minLat: 43.6520, maxLat: 43.6640, minLng: -79.4260, maxLng: -79.4050 },
  { name: "Trinity-Bellwoods",    minLat: 43.6430, maxLat: 43.6530, minLng: -79.4210, maxLng: -79.4040 },
  { name: "Little Portugal",      minLat: 43.6430, maxLat: 43.6530, minLng: -79.4380, maxLng: -79.4200 },
  // Central
  { name: "Kensington Market",    minLat: 43.6515, maxLat: 43.6590, minLng: -79.4110, maxLng: -79.3950 },
  { name: "Chinatown",            minLat: 43.6505, maxLat: 43.6580, minLng: -79.4040, maxLng: -79.3910 },
  { name: "The Annex",            minLat: 43.6620, maxLat: 43.6750, minLng: -79.4160, maxLng: -79.3840 },
  { name: "Yorkville",            minLat: 43.6680, maxLat: 43.6810, minLng: -79.4060, maxLng: -79.3810 },
  { name: "Harbord Village",      minLat: 43.6570, maxLat: 43.6650, minLng: -79.4060, maxLng: -79.3930 },
  { name: "University",           minLat: 43.6570, maxLat: 43.6680, minLng: -79.3960, maxLng: -79.3860 },
  // Downtown Core
  { name: "Financial District",   minLat: 43.6430, maxLat: 43.6540, minLng: -79.3900, maxLng: -79.3720 },
  { name: "Entertainment District", minLat: 43.6430, maxLat: 43.6530, minLng: -79.3990, maxLng: -79.3830 },
  { name: "St. Lawrence Market",  minLat: 43.6460, maxLat: 43.6530, minLng: -79.3770, maxLng: -79.3660 },
  { name: "Old Town",             minLat: 43.6490, maxLat: 43.6580, minLng: -79.3790, maxLng: -79.3660 },
  { name: "Garden District",      minLat: 43.6540, maxLat: 43.6620, minLng: -79.3820, maxLng: -79.3710 },
  { name: "Waterfront",           minLat: 43.6330, maxLat: 43.6480, minLng: -79.4000, maxLng: -79.3570 },
  // East
  { name: "Corktown",             minLat: 43.6490, maxLat: 43.6600, minLng: -79.3740, maxLng: -79.3570 },
  { name: "Distillery District",  minLat: 43.6470, maxLat: 43.6545, minLng: -79.3640, maxLng: -79.3510 },
  { name: "Riverside",            minLat: 43.6540, maxLat: 43.6640, minLng: -79.3540, maxLng: -79.3370 },
  { name: "Leslieville",          minLat: 43.6540, maxLat: 43.6680, minLng: -79.3370, maxLng: -79.3100 },
  { name: "The Beaches",          minLat: 43.6620, maxLat: 43.6820, minLng: -79.3120, maxLng: -79.2750 },
  { name: "Greektown",            minLat: 43.6780, maxLat: 43.6870, minLng: -79.3600, maxLng: -79.3330 },
  { name: "East Chinatown",       minLat: 43.6640, maxLat: 43.6720, minLng: -79.3530, maxLng: -79.3380 },
  // North
  { name: "Koreatown",            minLat: 43.6570, maxLat: 43.6680, minLng: -79.4220, maxLng: -79.4050 },
  { name: "Corso Italia",         minLat: 43.6770, maxLat: 43.6870, minLng: -79.4480, maxLng: -79.4230 },
  { name: "St. Clair West",       minLat: 43.6780, maxLat: 43.6880, minLng: -79.4350, maxLng: -79.4100 },
  { name: "Midtown",              minLat: 43.6870, maxLat: 43.7050, minLng: -79.4100, maxLng: -79.3830 },
  { name: "North York",           minLat: 43.7200, maxLat: 43.7800, minLng: -79.4600, maxLng: -79.3400 },
  { name: "Scarborough",          minLat: 43.7200, maxLat: 43.8100, minLng: -79.2800, maxLng: -79.1200 },
  { name: "Etobicoke",            minLat: 43.6200, maxLat: 43.7200, minLng: -79.5900, maxLng: -79.4700 },
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
