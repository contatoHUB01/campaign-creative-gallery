import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';
import type { GeoTargeting } from '@/lib/geo';

const LeafletMap = lazy(() => import('./campaign-geo-map-leaflet'));

export function CampaignGeoMap({ geo }: { geo?: GeoTargeting }) {
  if (!geo) return null;
  const points = geo.customLocations ?? [];
  const included = geo.locationNames ?? [];
  const excluded = geo.excludedNames ?? [];
  if (!points.length && !included.length && !excluded.length) return null;
  const skeleton = <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />;
  return (
    <div className="mb-6 space-y-3 print:break-inside-avoid">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary"><MapPin size={15} />Área de cobertura</div>
      {points.length > 0 && <ClientOnly fallback={skeleton}><Suspense fallback={skeleton}><LeafletMap points={points} /></Suspense></ClientOnly>}
      {included.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-semibold uppercase text-muted-foreground">Locais incluídos</span>{included.map(n => <span key={n} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{n}</span>)}</div>}
      {excluded.length > 0 && <div className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-[11px] font-semibold uppercase text-muted-foreground">Locais excluídos</span>{excluded.map(n => <span key={n} className="rounded-full border border-destructive/30 bg-destructive/5 px-2.5 py-0.5 text-xs font-medium text-destructive">{n}</span>)}</div>}
    </div>
  );
}
