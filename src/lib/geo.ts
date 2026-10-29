// Browser-safe geo targeting types and helpers (no Leaflet import here).
export type GeoTargeting = {
  customLocations?: Array<{ lat: number; lng: number; radiusKm: number }>;
  locationNames?: string[];
  excludedNames?: string[];
};

type RawLoc = { latitude?: number | string; longitude?: number | string; radius?: number | string; distance_unit?: string; name?: string; address_string?: string };
type RawGeo = { custom_locations?: RawLoc[]; cities?: RawLoc[]; subcities?: RawLoc[]; neighborhoods?: RawLoc[]; regions?: RawLoc[]; countries?: string[]; zips?: RawLoc[] } | null | undefined;

const names = (g: RawGeo) => [
  ...(g?.neighborhoods ?? []), ...(g?.subcities ?? []), ...(g?.cities ?? []), ...(g?.regions ?? []), ...(g?.zips ?? []),
].map(l => l.name?.trim()).filter((n): n is string => Boolean(n)).concat(g?.countries ?? []);

/** Converts Meta targeting geo fields into the report shape; miles become kilometres. */
export function normalizeGeo(include: RawGeo, exclude: RawGeo): GeoTargeting | undefined {
  const customLocations = (include?.custom_locations ?? []).flatMap(l => {
    const lat = Number(l.latitude), lng = Number(l.longitude), r = Number(l.radius);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const radiusKm = Number.isFinite(r) && r > 0 ? (l.distance_unit === 'mile' ? r * 1.60934 : r) : 1;
    return [{ lat, lng, radiusKm: Math.round(radiusKm * 100) / 100 }];
  });
  const customNames = (include?.custom_locations ?? []).map(l => l.name || l.address_string).filter((n): n is string => Boolean(n));
  const geo: GeoTargeting = { customLocations, locationNames: [...names(include), ...customNames], excludedNames: [...names(exclude), ...(exclude?.custom_locations ?? []).map(l => l.name || l.address_string).filter((n): n is string => Boolean(n))] };
  return customLocations.length || geo.locationNames!.length || geo.excludedNames!.length ? geo : undefined;
}

/** Merges geo targeting of many ads (e.g. one campaign) without duplicates. */
export function mergeGeo(list: Array<GeoTargeting | undefined>): GeoTargeting | undefined {
  const pins = new Map<string, { lat: number; lng: number; radiusKm: number }>();
  const inc = new Set<string>(), exc = new Set<string>();
  for (const g of list) {
    g?.customLocations?.forEach(p => pins.set(`${p.lat},${p.lng},${p.radiusKm}`, p));
    g?.locationNames?.forEach(n => inc.add(n));
    g?.excludedNames?.forEach(n => exc.add(n));
  }
  if (!pins.size && !inc.size && !exc.size) return undefined;
  return { customLocations: [...pins.values()], locationNames: [...inc], excludedNames: [...exc] };
}
