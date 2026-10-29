import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { GeoTargeting } from '@/lib/geo';

export default function LeafletMap({ points }: { points: NonNullable<GeoTargeting['customLocations']> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;
    let map: import('leaflet').Map | undefined;
    let observer: ResizeObserver | undefined;
    let cancelled = false;
    void import('leaflet').then(({ default: L }) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#004565';
      // SVG pin avoids Leaflet's default PNG icon paths, which break under Vite.
      const icon = L.divIcon({
        className: '',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        html: `<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
      });
      const layers = points.map(p => {
        L.marker([p.lat, p.lng], { icon }).addTo(map!).bindTooltip(`Raio de ${p.radiusKm.toLocaleString('pt-BR')} km`);
        return L.circle([p.lat, p.lng], { radius: p.radiusKm * 1000, color: '#2563eb', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 0.2 }).addTo(map!);
      });
      const fit = () => { map!.invalidateSize(); map!.fitBounds(L.featureGroup(layers).getBounds(), { padding: [20, 20], maxZoom: 14 }); };
      fit();
      requestAnimationFrame(fit);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(ref.current);
    });
    return () => { cancelled = true; observer?.disconnect(); map?.remove(); };
  }, [points]);
  return <div ref={ref} className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-border" aria-label="Mapa da área de cobertura" />;
}
