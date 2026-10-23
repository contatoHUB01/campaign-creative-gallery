import { Instagram, Facebook, MousePointer2, Wallet, MessageCircle, Megaphone, ImageOff, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { currency, number, type Ad } from '@/lib/ads';

export function CreativeCard({
  ad,
  showClicks = true,
  showSpent = true,
  showConversations = true,
  showCardMetrics = true, // 👈 Nova prop que controla a área inteira de métricas do cartão
}: {
  ad: Ad;
  showClicks?: boolean;
  showSpent?: boolean;
  showConversations?: boolean;
  showCardMetrics?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const Platform = ad.format.includes('Instagram') ? Instagram : Facebook;
  const hasImage = Boolean(ad.imageUrl) && !imageFailed;

  return (
    <article className="creative-card overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {hasImage ? (
          <>
            <img
              src={ad.imageUrl}
              alt={ad.title}
              width={1024}
              height={1024}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Ampliar imagem do criativo"
              title="Ampliar imagem"
              className="group absolute inset-0 cursor-zoom-in"
            >
              <span className="absolute right-2 top-2 hidden items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur group-hover:flex">
                <Maximize2 size={12} />Ampliar
              </span>
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-label="Imagem indisponível">
            <ImageOff size={28} />
            <span className="text-[11px]">Sem imagem disponível</span>
          </div>
        )}
        <span className={`status-badge ${ad.status === 'Ativo' ? 'status-active' : 'status-paused'}`}>
          <span className="status-dot" />{ad.status}
        </span>
        <span className="platform-badge">
          <Platform size={13} />{ad.format}
        </span>
      </div>
      <div className="px-5 pb-5 pt-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Megaphone size={12} className="shrink-0" />{ad.campaign}
        </p>
        <h3 className="text-[17px] font-semibold leading-6">{ad.title}</h3>
        <p className="mt-2 min-h-[66px] text-[13px] leading-[22px] text-muted-foreground">{ad.copy}</p>
      </div>
      
      {/* Exibe o rodapé de métricas apenas se showCardMetrics for true */}
      {showCardMetrics && (() => {
        const metrics = [
          ...(showClicks ? [{ label: 'Cliques', value: number(ad.clicks), icon: MousePointer2 }] : []),
          ...(showSpent ? [{ label: 'Valor gasto', value: currency(ad.spent), icon: Wallet }] : []),
          ...(showConversations ? [{ label: 'Conversas', value: number(ad.conversations ?? 0), icon: MessageCircle }] : []),
        ];
        if (!metrics.length) return null;
        return (
          <div className={`grid border-t border-border bg-metric px-5 py-4 ${metrics.length === 3 ? 'grid-cols-3' : metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {metrics.map((metric, index) => (
              <div key={metric.label} className={index ? 'border-l border-border pl-4' : ''}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <metric.icon size={13} />{metric.label}
                </p>
                <p className="text-lg font-semibold tabular-nums">{metric.value}</p>
              </div>
            ))}
          </div>
        );
      })()}

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[960px] gap-0 border-none bg-transparent p-0 sm:max-w-[960px]">
          <DialogTitle className="sr-only">{ad.title}</DialogTitle>
          {hasImage ? (
            <img
              src={ad.imageUrl}
              alt={ad.title}
              decoding="async"
              referrerPolicy="no-referrer"
              className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground" aria-label="Imagem indisponível">
              <ImageOff size={32} />
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">{ad.campaign} — {ad.title}</p>
        </DialogContent>
      </Dialog>
    </article>
  );
}
