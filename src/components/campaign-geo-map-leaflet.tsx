import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { GeoTargeting } from '@/lib/geo';

type Found = { lat: number; lng: number; geojson?: GeoJSON.GeoJsonObject };
const CACHE_KEY = 'geo-area-cache-v1';

/** Finds a named area on OpenStreetMap (Nominatim); results are kept in the browser to avoid repeat searches. */
async function findArea(name: string): Promise<Found | null> {
  let cache: Record<string, Found | null> = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}'); } catch { /* ignore */ }
  if (name in cache) return cache[name] ?? null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&polygon_geojson=1&polygon_threshold=0.001&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(name)}`;
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null; // not cached: try again next time
  const [hit] = (await res.json()) as Array<{ lat: string; lon: string; geojson?: GeoJSON.GeoJsonObject }>;
  const found = hit ? { lat: Number(hit.lat), lng: Number(hit.lon), ...(hit.geojson && hit.geojson.type !== 'Point' ? { geojson: hit.geojson } : {}) } : null;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, [name]: found })); } catch { /* storage full */ }
  return found;
}

export default function LeafletMap({ points, areas = [] }: { points: NonNullable<GeoTargeting['customLocations']>; areas?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    let map: import('leaflet').Map | undefined;
    let observer: ResizeObserver | undefined;
    let cancelled = false;
    void import('leaflet').then(({ default: L }) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
      // A view must exist before circles can compute bounds (they project metres to pixels).
      map.setView(points[0] ? [points[0].lat, points[0].lng] : [-14.2, -51.9], points[0] ? 12 : 4);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#004565';
      // SVG pin avoids Leaflet's default PNG icon paths, which break under Vite.
      const icon = L.divIcon({
        className: '',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
      });
      points.forEach(p => {
        L.marker([p.lat, p.lng], { icon }).addTo(map!).bindTooltip(`Raio de ${p.radiusKm.toLocaleString('pt-BR')} km`);
        L.circle([p.lat, p.lng], { radius: p.radiusKm * 1000, color: '#2563eb', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.2 }).addTo(map!);
      });
      const bounds = points.reduce((acc, p) => acc.extend(L.latLng(p.lat, p.lng).toBounds(p.radiusKm * 2000)), L.latLngBounds([]));
      const fit = () => { if (!map) return; map.invalidateSize(); if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 }); };
      void (async () => {
        for (const name of areas.slice(0, 15)) {
          const found = await findArea(name);
          if (cancelled || !map) return;
          if (!found || !Number.isFinite(found.lat)) continue;
          L.marker([found.lat, found.lng], { icon }).addTo(map).bindTooltip(name);
          if (found.geojson) {
            const layer = L.geoJSON(found.geojson as never, { style: { color: '#2563eb', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.2 } }).addTo(map);
            bounds.extend(layer.getBounds());
          } else bounds.extend(L.latLng(found.lat, found.lng).toBounds(3000));
          fit();
        }
      })();
      fit();
      requestAnimationFrame(fit);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(ref.current);
    });
    return () => { cancelled = true; observer?.disconnect(); map?.remove(); };
  }, [points, areas.join('|')]);
  return <div ref={ref} className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-border" aria-label="Mapa da área de cobertura" />;
}
