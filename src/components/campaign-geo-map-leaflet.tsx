import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { GeoTargeting } from '@/lib/geo';

export default function LeafletMap({ points }: { points: NonNullable<GeoTargeting['customLocations']> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    void import('leaflet').then(({ default: L }) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'currentColor';
      const layers = points.map(p => {
        L.circleMarker([p.lat, p.lng], { radius: 6, color, weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map!).bindTooltip(`Raio de ${p.radiusKm.toLocaleString('pt-BR')} km`);
        return L.circle([p.lat, p.lng], { radius: p.radiusKm * 1000, color, weight: 1.5, fillOpacity: 0.2 }).addTo(map!);
      });
      map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [20, 20], maxZoom: 14 });
    });
    return () => { cancelled = true; map?.remove(); };
  }, [points]);
  return <div ref={ref} className="h-64 w-full overflow-hidden rounded-lg border border-border" aria-label="Mapa da área de cobertura" />;
}
