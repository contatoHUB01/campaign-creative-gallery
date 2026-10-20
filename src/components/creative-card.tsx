import { Instagram, Facebook, MousePointer2, Wallet, MessageCircle, Megaphone, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { currency, number, type Ad } from '@/lib/ads';

export function CreativeCard({ ad, showClicks = true, showSpent = true, showConversations = true }: { ad: Ad; showClicks?: boolean; showSpent?: boolean; showConversations?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const Platform = ad.format.includes('Instagram') ? Instagram : Facebook;
  return (
    <article className="creative-card overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {ad.imageUrl && !imageFailed ? <>
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
          <img src={ad.imageUrl} alt={ad.title} width={1024} height={1024} loading="lazy" decoding="async" onLoad={() => setImageLoaded(true)} onError={() => setImageFailed(true)} className={`h-full w-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} />
        </> : <div className="flex h-full items-center justify-center text-muted-foreground" aria-label="Imagem indisponível"><ImageOff size={32} /></div>}
        <span className={`status-badge ${ad.status === 'Ativo' ? 'status-active' : 'status-paused'}`}><span className="status-dot" />{ad.status}</span>
        <span className="platform-badge"><Platform size={13} />{ad.format}</span>
      </div>
      <div className="px-5 pb-5 pt-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Megaphone size={12} className="shrink-0" />{ad.campaign}</p>
        <h3 className="text-[17px] font-semibold leading-6">{ad.title}</h3>
        <p className="mt-2 min-h-[66px] text-[13px] leading-[22px] text-muted-foreground">{ad.copy}</p>
      </div>
      {(() => {
        const metrics = [
          ...(showClicks ? [{ label: 'Cliques', value: number(ad.clicks), icon: MousePointer2 }] : []),
          ...(showSpent ? [{ label: 'Valor gasto', value: currency(ad.spent), icon: Wallet }] : []),
          ...(showConversations ? [{ label: 'Conversas', value: number(ad.conversations ?? 0), icon: MessageCircle }] : []),
        ];
        if (!metrics.length) return null;
        return <div className={`grid border-t border-border bg-metric px-5 py-4 ${metrics.length === 3 ? 'grid-cols-3' : metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {metrics.map((metric, index) => <div key={metric.label} className={index ? 'border-l border-border pl-4' : ''}><p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><metric.icon size={13} />{metric.label}</p><p className="text-lg font-semibold tabular-nums">{metric.value}</p></div>)}
        </div>;
      })()}
    </article>
  );
}