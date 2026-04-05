export interface Neighbourhood {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const NEIGHBOURHOODS: Neighbourhood[] = [
  // ── West End ──
  { name: "The Junction",         minLat: 43.6600, maxLat: 43.6740, minLng: -79.4700, maxLng: -79.4440 },
  { name: "Junction Triangle",    minLat: 43.6570, maxLat: 43.6650, minLng: -79.4580, maxLng: -79.4370 },
  { name: "Bloor West Village",   minLat: 43.6470, maxLat: 43.6620, minLng: -79.4940, maxLng: -79.4680 },
  { name: "High Park",            minLat: 43.6380, maxLat: 43.6600, minLng: -79.4750, maxLng: -79.4480 },
  { name: "Roncesvalles",         minLat: 43.6450, maxLat: 43.6630, minLng: -79.4530, maxLng: -79.4270 },
  { name: "Parkdale",             minLat: 43.6350, maxLat: 43.6470, minLng: -79.4530, maxLng: -79.4260 },
  { name: "Liberty Village",      minLat: 43.6360, maxLat: 43.6460, minLng: -79.4350, maxLng: -79.4050 },
  // ── West-Central ──
  { name: "West Queen West",      minLat: 43.6440, maxLat: 43.6510, minLng: -79.4340, maxLng: -79.4130 },
  { name: "Queen West",           minLat: 43.6410, maxLat: 43.6510, minLng: -79.4130, maxLng: -79.3850 },
  { name: "Ossington",            minLat: 43.6460, maxLat: 43.6600, minLng: -79.4280, maxLng: -79.4120 },
  { name: "Dundas West",          minLat: 43.6480, maxLat: 43.6580, minLng: -79.4440, maxLng: -79.4200 },
  { name: "Little Italy",         minLat: 43.6520, maxLat: 43.6640, minLng: -79.4260, maxLng: -79.4050 },
  { name: "Trinity-Bellwoods",    minLat: 43.6430, maxLat: 43.6530, minLng: -79.4210, maxLng: -79.4040 },
  { name: "Little Portugal",      minLat: 43.6430, maxLat: 43.6530, minLng: -79.4380, maxLng: -79.4200 },
  // ── Central ──
  { name: "Kensington Market",    minLat: 43.6515, maxLat: 43.6590, minLng: -79.4110, maxLng: -79.3950 },
  { name: "Chinatown",            minLat: 43.6505, maxLat: 43.6580, minLng: -79.4040, maxLng: -79.3910 },
  { name: "The Annex",            minLat: 43.6620, maxLat: 43.6750, minLng: -79.4160, maxLng: -79.3840 },
  { name: "Yorkville",            minLat: 43.6680, maxLat: 43.6810, minLng: -79.4060, maxLng: -79.3810 },
  { name: "Harbord Village",      minLat: 43.6570, maxLat: 43.6650, minLng: -79.4060, maxLng: -79.3930 },
  { name: "University",           minLat: 43.6570, maxLat: 43.6680, minLng: -79.3960, maxLng: -79.3860 },
  { name: "Casa Loma",            minLat: 43.6760, maxLat: 43.6880, minLng: -79.4160, maxLng: -79.4000 },
  { name: "Yonge Corridor",       minLat: 43.6450, maxLat: 43.6600, minLng: -79.3900, maxLng: -79.3700 },
  { name: "St. James Town",       minLat: 43.6650, maxLat: 43.6750, minLng: -79.3800, maxLng: -79.3700 },
  // ── Downtown Core ──
  { name: "Financial District",   minLat: 43.6430, maxLat: 43.6540, minLng: -79.3900, maxLng: -79.3720 },
  { name: "Entertainment District", minLat: 43.6430, maxLat: 43.6530, minLng: -79.3990, maxLng: -79.3830 },
  { name: "St. Lawrence Market",  minLat: 43.6460, maxLat: 43.6530, minLng: -79.3770, maxLng: -79.3660 },
  { name: "Old Town",             minLat: 43.6490, maxLat: 43.6580, minLng: -79.3790, maxLng: -79.3660 },
  { name: "Garden District",      minLat: 43.6540, maxLat: 43.6620, minLng: -79.3820, maxLng: -79.3710 },
  { name: "Waterfront",           minLat: 43.6330, maxLat: 43.6480, minLng: -79.4000, maxLng: -79.3570 },
  // ── East ──
  { name: "Corktown",             minLat: 43.6490, maxLat: 43.6600, minLng: -79.3740, maxLng: -79.3570 },
  { name: "Distillery District",  minLat: 43.6470, maxLat: 43.6545, minLng: -79.3640, maxLng: -79.3510 },
  { name: "Riverside",            minLat: 43.6540, maxLat: 43.6640, minLng: -79.3540, maxLng: -79.3370 },
  { name: "Leslieville",          minLat: 43.6540, maxLat: 43.6680, minLng: -79.3370, maxLng: -79.3100 },
  { name: "The Beaches",          minLat: 43.6620, maxLat: 43.6820, minLng: -79.3120, maxLng: -79.2750 },
  { name: "Greektown",            minLat: 43.6780, maxLat: 43.6870, minLng: -79.3600, maxLng: -79.3330 },
  { name: "East Chinatown",       minLat: 43.6640, maxLat: 43.6720, minLng: -79.3530, maxLng: -79.3380 },
  { name: "Broadview North",      minLat: 43.6820, maxLat: 43.6970, minLng: -79.3630, maxLng: -79.3480 },
  { name: "East Danforth",        minLat: 43.6780, maxLat: 43.6980, minLng: -79.3350, maxLng: -79.2900 },
  { name: "Old East York",        minLat: 43.6900, maxLat: 43.7120, minLng: -79.3400, maxLng: -79.3050 },
  { name: "Birchcliffe-Cliffside", minLat: 43.6880, maxLat: 43.7250, minLng: -79.2700, maxLng: -79.2250 },
  { name: "Taylor-Massey",        minLat: 43.6900, maxLat: 43.7080, minLng: -79.3050, maxLng: -79.2700 },
  { name: "East York North",      minLat: 43.6950, maxLat: 43.7150, minLng: -79.3650, maxLng: -79.3400 },
  { name: "Flemingdon Park",      minLat: 43.7100, maxLat: 43.7250, minLng: -79.3450, maxLng: -79.3250 },
  { name: "Victoria Village",     minLat: 43.7200, maxLat: 43.7380, minLng: -79.3250, maxLng: -79.3050 },
  { name: "Kennedy Park",         minLat: 43.7180, maxLat: 43.7420, minLng: -79.2750, maxLng: -79.2500 },
  { name: "Wexford",              minLat: 43.7400, maxLat: 43.7580, minLng: -79.3100, maxLng: -79.2850 },
  { name: "Eglinton East",        minLat: 43.7330, maxLat: 43.7520, minLng: -79.2600, maxLng: -79.2350 },
  // ── North ──
  { name: "Koreatown",            minLat: 43.6570, maxLat: 43.6680, minLng: -79.4220, maxLng: -79.4050 },
  { name: "Corso Italia",         minLat: 43.6770, maxLat: 43.6870, minLng: -79.4480, maxLng: -79.4230 },
  { name: "St. Clair West",       minLat: 43.6780, maxLat: 43.6880, minLng: -79.4350, maxLng: -79.4100 },
  { name: "Oakwood Village",      minLat: 43.6820, maxLat: 43.6950, minLng: -79.4450, maxLng: -79.4300 },
  { name: "Midtown",              minLat: 43.6870, maxLat: 43.7050, minLng: -79.4100, maxLng: -79.3830 },
  { name: "Yonge-St. Clair",      minLat: 43.6820, maxLat: 43.6950, minLng: -79.4050, maxLng: -79.3900 },
  { name: "Forest Hill",          minLat: 43.6880, maxLat: 43.7120, minLng: -79.4350, maxLng: -79.4050 },
  { name: "North Toronto",        minLat: 43.7050, maxLat: 43.7350, minLng: -79.4150, maxLng: -79.3900 },
  { name: "Bedford Park",         minLat: 43.7250, maxLat: 43.7400, minLng: -79.4400, maxLng: -79.4100 },
  { name: "Leaside-Don Mills",    minLat: 43.7250, maxLat: 43.7450, minLng: -79.3900, maxLng: -79.3400 },
  { name: "St. Andrew-Windfields", minLat: 43.7480, maxLat: 43.7680, minLng: -79.4050, maxLng: -79.3750 },
  { name: "Bayview Village",      minLat: 43.7700, maxLat: 43.7950, minLng: -79.3850, maxLng: -79.3450 },
  { name: "Parkwoods",            minLat: 43.7450, maxLat: 43.7780, minLng: -79.3500, maxLng: -79.3250 },
  { name: "Pleasant View",        minLat: 43.7820, maxLat: 43.8080, minLng: -79.3350, maxLng: -79.2950 },
  { name: "Bathurst Manor",       minLat: 43.7380, maxLat: 43.7850, minLng: -79.4600, maxLng: -79.4400 },
  { name: "Bayview Woods",        minLat: 43.7900, maxLat: 43.8150, minLng: -79.3950, maxLng: -79.3450 },
  // ── North York (expanded) ──
  { name: "North York",           minLat: 43.7200, maxLat: 43.7800, minLng: -79.4600, maxLng: -79.3400 },
  { name: "Yorkdale",             minLat: 43.7080, maxLat: 43.7220, minLng: -79.4650, maxLng: -79.4450 },
  { name: "Downsview",            minLat: 43.7100, maxLat: 43.7450, minLng: -79.5000, maxLng: -79.4700 },
  // ── West expansion ──
  { name: "Caledonia-Fairbank",   minLat: 43.6850, maxLat: 43.7050, minLng: -79.4600, maxLng: -79.4400 },
  { name: "Keelesdale",           minLat: 43.6700, maxLat: 43.7000, minLng: -79.5000, maxLng: -79.4700 },
  { name: "Mount Dennis",         minLat: 43.6700, maxLat: 43.7000, minLng: -79.5050, maxLng: -79.4600 },
  { name: "Weston",               minLat: 43.6950, maxLat: 43.7150, minLng: -79.5300, maxLng: -79.4800 },
  { name: "Humber Bay Shores",    minLat: 43.6150, maxLat: 43.6450, minLng: -79.5100, maxLng: -79.4700 },
  { name: "Kingsway",             minLat: 43.6450, maxLat: 43.6650, minLng: -79.5150, maxLng: -79.4880 },
  { name: "Princess-Rosethorn",   minLat: 43.6580, maxLat: 43.6800, minLng: -79.5550, maxLng: -79.5100 },
  { name: "Long Branch",          minLat: 43.5850, maxLat: 43.6120, minLng: -79.5500, maxLng: -79.5000 },
  { name: "Markland Wood",        minLat: 43.6250, maxLat: 43.6650, minLng: -79.5900, maxLng: -79.5550 },
  // ── Etobicoke / Far West ──
  { name: "Etobicoke",            minLat: 43.6200, maxLat: 43.7200, minLng: -79.5900, maxLng: -79.4700 },
  { name: "West Etobicoke",       minLat: 43.6750, maxLat: 43.7100, minLng: -79.5650, maxLng: -79.5350 },
  { name: "Rexdale",              minLat: 43.7150, maxLat: 43.7500, minLng: -79.5800, maxLng: -79.5300 },
  { name: "Humber Summit",        minLat: 43.7000, maxLat: 43.7700, minLng: -79.6100, maxLng: -79.5550 },
  { name: "Pelmo Park",           minLat: 43.7150, maxLat: 43.7400, minLng: -79.5300, maxLng: -79.4950 },
  { name: "Glenfield-Jane Heights", minLat: 43.7380, maxLat: 43.7750, minLng: -79.5300, maxLng: -79.5000 },
  { name: "York University",      minLat: 43.7580, maxLat: 43.7750, minLng: -79.5000, maxLng: -79.4800 },
  // ── Scarborough (expanded) ──
  { name: "Scarborough",          minLat: 43.7200, maxLat: 43.8100, minLng: -79.2800, maxLng: -79.1200 },
  { name: "Scarborough West",     minLat: 43.7500, maxLat: 43.7680, minLng: -79.2900, maxLng: -79.2680 },
  { name: "Tam O'Shanter",        minLat: 43.7750, maxLat: 43.7920, minLng: -79.3150, maxLng: -79.2920 },
  { name: "Agincourt",            minLat: 43.7830, maxLat: 43.8150, minLng: -79.2800, maxLng: -79.2500 },
  { name: "Steeles",              minLat: 43.8080, maxLat: 43.8250, minLng: -79.3350, maxLng: -79.2650 },
  { name: "Malvern",              minLat: 43.7980, maxLat: 43.8350, minLng: -79.2400, maxLng: -79.1950 },
  { name: "Scarborough South",    minLat: 43.7550, maxLat: 43.7800, minLng: -79.2400, maxLng: -79.2100 },
  { name: "Guildwood",            minLat: 43.7400, maxLat: 43.7750, minLng: -79.2000, maxLng: -79.1650 },
  { name: "Highland Creek",       minLat: 43.7750, maxLat: 43.8050, minLng: -79.1900, maxLng: -79.1400 },
  { name: "Morningside",          minLat: 43.7730, maxLat: 43.7900, minLng: -79.2200, maxLng: -79.1950 },
];

/** Maps our neighbourhood names to official City of Toronto AREA_NAME(s) in the GeoJSON */
export const NEIGHBOURHOOD_GEOJSON_MAP: Record<string, string[]> = {
  // Original 38
  "The Junction": ["Junction Area"],
  "Junction Triangle": ["Junction-Wallace Emerson"],
  "Bloor West Village": ["Runnymede-Bloor West Village"],
  "High Park": ["High Park-Swansea", "High Park North"],
  "Roncesvalles": ["Roncesvalles"],
  "Parkdale": ["South Parkdale"],
  "Liberty Village": ["Fort York-Liberty Village"],
  "West Queen West": ["West Queen West"],
  "Queen West": ["Trinity-Bellwoods"],
  "Ossington": ["Dovercourt Village"],
  "Dundas West": ["Dufferin Grove"],
  "Little Italy": ["Palmerston-Little Italy"],
  "Trinity-Bellwoods": ["Trinity-Bellwoods"],
  "Little Portugal": ["Little Portugal"],
  "Kensington Market": ["Kensington-Chinatown"],
  "Chinatown": ["Kensington-Chinatown"],
  "The Annex": ["Annex"],
  "Yorkville": ["Rosedale-Moore Park", "Bay-Cloverhill"],
  "Harbord Village": ["University"],
  "University": ["University"],
  "Financial District": ["Wellington Place"],
  "Entertainment District": ["Wellington Place"],
  "St. Lawrence Market": ["St Lawrence-East Bayfront-The Islands"],
  "Old Town": ["Moss Park", "Cabbagetown-South St.James Town"],
  "Garden District": ["Church-Wellesley"],
  "Waterfront": ["Harbourfront-CityPlace"],
  "Corktown": ["Regent Park", "Moss Park"],
  "Distillery District": ["St Lawrence-East Bayfront-The Islands"],
  "Riverside": ["South Riverdale", "North Riverdale"],
  "Leslieville": ["Greenwood-Coxwell", "Blake-Jones"],
  "The Beaches": ["The Beaches", "Woodbine Corridor"],
  "Greektown": ["Playter Estates-Danforth", "Danforth"],
  "East Chinatown": ["South Riverdale"],
  "Koreatown": ["Palmerston-Little Italy", "Wychwood"],
  "Corso Italia": ["Corso Italia-Davenport"],
  "St. Clair West": ["Humewood-Cedarvale", "Wychwood"],
  "Midtown": ["South Eglinton-Davisville", "Yonge-Eglinton", "Mount Pleasant East"],
  "North York": ["Yonge-Doris", "East Willowdale", "Willowdale West", "Lansing-Westgate", "Newtonbrook East", "Newtonbrook West"],
  "Scarborough": ["Scarborough Village", "Bendale South", "Bendale-Glen Andrew", "Clairlea-Birchmount"],
  "Etobicoke": ["Etobicoke City Centre", "Etobicoke West Mall", "Islington", "Mimico-Queensway"],
  // Core fill-ins
  "Yonge Corridor": ["Yonge-Bay Corridor", "Downtown Yonge East"],
  "St. James Town": ["North St.James Town"],
  "Casa Loma": ["Casa Loma"],
  "Forest Hill": ["Forest Hill South", "Forest Hill North"],
  "Yonge-St. Clair": ["Yonge-St.Clair"],
  "Oakwood Village": ["Oakwood Village"],
  "Broadview North": ["Broadview North"],
  // East expansion
  "East Danforth": ["East End-Danforth", "Woodbine-Lumsden", "Danforth East York"],
  "Old East York": ["Old East York", "O'Connor-Parkview"],
  "Birchcliffe-Cliffside": ["Birchcliffe-Cliffside", "Cliffcrest"],
  "Taylor-Massey": ["Taylor-Massey", "Oakridge"],
  "East York North": ["Leaside-Bennington", "Thorncliffe Park"],
  "Flemingdon Park": ["Flemingdon Park"],
  "Victoria Village": ["Victoria Village"],
  "Kennedy Park": ["Kennedy Park", "Ionview"],
  "Wexford": ["Wexford/Maryvale"],
  "Eglinton East": ["Eglinton East"],
  // North expansion
  "North Toronto": ["North Toronto", "Lawrence Park South", "Lawrence Park North"],
  "Bedford Park": ["Bedford Park-Nortown", "Englemount-Lawrence"],
  "Leaside-Don Mills": ["Banbury-Don Mills", "Bridle Path-Sunnybrook-York Mills"],
  "St. Andrew-Windfields": ["St.Andrew-Windfields", "Avondale"],
  "Bayview Village": ["Bayview Village", "Don Valley Village"],
  "Parkwoods": ["Parkwoods-O'Connor Hills", "Fenside-Parkwoods", "Henry Farm"],
  "Pleasant View": ["Pleasant View", "L'Amoreaux West", "East L'Amoreaux"],
  "Bathurst Manor": ["Bathurst Manor", "Clanton Park", "Westminster-Branson"],
  "Bayview Woods": ["Bayview Woods-Steeles", "Hillcrest Village"],
  // West expansion
  "Caledonia-Fairbank": ["Caledonia-Fairbank", "Briar Hill-Belgravia"],
  "Keelesdale": ["Keelesdale-Eglinton West", "Beechborough-Greenbrook", "Rockcliffe-Smythe"],
  "Mount Dennis": ["Mount Dennis", "Weston-Pelham Park"],
  "Weston": ["Weston", "Humber Heights-Westmount", "Brookhaven-Amesbury"],
  "Humber Bay Shores": ["Humber Bay Shores", "Stonegate-Queensway"],
  "Kingsway": ["Kingsway South", "Lambton Baby Point"],
  "Princess-Rosethorn": ["Princess-Rosethorn", "Edenbridge-Humber Valley"],
  "Long Branch": ["Long Branch", "New Toronto", "Alderwood"],
  "Markland Wood": ["Markland Wood", "Eringate-Centennial-West Deane"],
  // Far west / northwest
  "West Etobicoke": ["Willowridge-Martingrove-Richview", "Kingsview Village-The Westway"],
  "Rexdale": ["Rexdale-Kipling", "Elms-Old Rexdale", "Thistletown-Beaumond Heights", "Humbermede"],
  "Humber Summit": ["Humber Summit", "Mount Olive-Silverstone-Jamestown", "West Humber-Clairville"],
  "Pelmo Park": ["Pelmo Park-Humberlea", "Oakdale-Beverley Heights"],
  "Downsview": ["Downsview", "Maple Leaf", "Rustic"],
  "Yorkdale": ["Yorkdale-Glen Park"],
  "Glenfield-Jane Heights": ["Glenfield-Jane Heights", "Black Creek"],
  "York University": ["York University Heights"],
  // Scarborough expansion
  "Scarborough West": ["Dorset Park"],
  "Tam O'Shanter": ["Tam O'Shanter-Sullivan"],
  "Agincourt": ["Agincourt North", "Agincourt South-Malvern West"],
  "Steeles": ["Steeles", "Milliken"],
  "Malvern": ["Malvern East", "Malvern West", "Morningside Heights"],
  "Scarborough South": ["Golfdale-Cedarbrae-Woburn", "Woburn North"],
  "Guildwood": ["Guildwood", "West Hill"],
  "Highland Creek": ["Highland Creek", "Centennial Scarborough", "West Rouge"],
  "Morningside": ["Morningside"],
};

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
