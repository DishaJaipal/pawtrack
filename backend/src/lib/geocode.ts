// Free, no-API-key geocoding via OpenStreetMap's Nominatim, using its
// *structured* query params (street/city/state/postalcode) rather than one
// free-text string — structured params are measurably more accurate because
// Nominatim doesn't have to guess which comma-separated token is which kind
// of place. The caller only needs the four pieces for this one call; nothing
// about how the address is stored elsewhere has to change.
async function structuredQuery(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const params = new URLSearchParams({ format: "json", limit: "1" });
  if (parts.street) params.set("street", parts.street);
  if (parts.city) params.set("city", parts.city);
  if (parts.state) params.set("state", parts.state);
  if (parts.postalCode) params.set("postalcode", parts.postalCode);
  if (![...params.keys()].some((k) => k !== "format" && k !== "limit")) return null;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "PawTrack/1.0" },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string }[];
    if (!results[0]) return null;
    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

// Structured mode is precise but brittle: if `street` doesn't exactly match
// something in Nominatim's index (a typo, or a street that's just not well
// mapped — common outside major cities), it returns nothing at all rather
// than degrading gracefully. So try full precision first, and if that comes
// back empty, retry one level coarser (drop the street) — a city-center
// point is still far more accurate than the single-free-text-line problem
// this replaced, and much better than no point at all.
export async function geocodeStructured(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const precise = await structuredQuery(parts);
  if (precise) return precise;
  if (!parts.street) return null;
  return structuredQuery({ ...parts, street: null });
}

// Same free-text lookup as before, kept for the parent-facing "type a city"
// search box, which has no structured pieces to work with.
export async function geocodeAddress(query: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "PawTrack/1.0" } }
    );
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string }[];
    if (!results[0]) return null;
    return { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
