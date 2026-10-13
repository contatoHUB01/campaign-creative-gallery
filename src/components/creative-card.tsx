import { Instagram, Facebook, MousePointer2, Wallet, Megaphone, ImageOff } from 'lucide-react';
import { useState } from 'react';
import { currency, number, type Ad } from '@/lib/ads';

export function CreativeCard({ ad }: { ad: Ad }) {
  const [imageFailed, setImageFailed] = useState(false);
  const Platform = ad.format.includes('Instagram') ? Instagram : Facebook;
  return (
    <article className="creative-card overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {ad.imageUrl && !imageFailed ? <img src={ad.imageUrl} alt={ad.title} width={1024} height={1024} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover transition-transform duration-500" /> : <div className="flex h-full items-center justify-center text-muted-foreground" aria-label="Imagem indisponível"><ImageOff size={32} /></div>}
        <span className={`status-badge ${ad.status === 'Ativo' ? 'status-active' : 'status-paused'}`}><span className="status-dot" />{ad.status}</span>
        <span className="platform-badge"><Platform size={13} />{ad.format}</span>
      </div>
      <div className="px-5 pb-5 pt-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Megaphone size={12} className="shrink-0" />{ad.campaign}</p>
        <h3 className="text-[17px] font-semibold leading-6">{ad.title}</h3>
        <p className="mt-2 min-h-[66px] text-[13px] leading-[22px] text-muted-foreground">{ad.copy}</p>
      </div>
      <div className="grid grid-cols-2 border-t border-border bg-metric px-5 py-4">
        <div><p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><MousePointer2 size={13} />Cliques</p><p className="text-lg font-semibold tabular-nums">{number(ad.clicks)}</p></div>
        <div className="border-l border-border pl-5"><p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet size={13} />Valor gasto</p><p className="text-lg font-semibold tabular-nums">{currency(ad.spent)}</p></div>
      </div>
    </article>
  );
}