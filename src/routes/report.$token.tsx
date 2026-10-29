import { createFileRoute } from '@tanstack/react-router';
import logo from '@/assets/logo-criativa.png.asset.json';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { LayoutGrid, MousePointer2, Wallet, CircleDollarSign, Sparkles, Infinity as MetaIcon, MessageCircle, Layers } from 'lucide-react';
import { CreativeCard } from '@/components/creative-card';
import { currency, number } from '@/lib/ads';
import { getSharedCampaignReport } from '@/lib/reportLinks.functions';
import { CampaignGeoMap } from '@/components/campaign-geo-map';
import { mergeGeo } from '@/lib/geo';
import type { CampaignGroup } from '@/lib/report-configuration';

const sharedReportQuery = (token: string) => queryOptions({
  queryKey: ['shared-campaign-report', token],
  queryFn: () => getSharedCampaignReport({ data: { token } }),
  staleTime: 1000 * 60 * 15,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchInterval: false,
  retry: false,
});

export const Route = createFileRoute('/report/$token')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sharedReportQuery(params.token)),
  head: () => ({
    meta: [
      { title: 'Relatório compartilhado | Criativa' },
      { name: 'description', content: 'Relatório personalizado de criativos e resultados das campanhas Meta Ads selecionadas.' },
      { property: 'og:title', content: 'Relatório compartilhado | Criativa' },
      { property: 'og:description', content: 'Criativos e resultados de campanha em uma visão clara.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: SharedCampaignReport,
});

function SharedCampaignReport() {
  const { token } = Route.useParams();
  const { data: report } = useSuspenseQuery(sharedReportQuery(token));

  // Trava de segurança: se houver erro ou o relatório não estiver pronto, renderiza a tela de erro sem travar o SSR
  if (!report || report.error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-[76px] max-w-[1240px] items-center px-6 sm:px-10">
            <span className="text-[23px] font-extrabold text-primary">criativa<span className="text-accent-brand">.</span></span>
          </div>
        </header>
        <main className="mx-auto max-w-[1240px] px-6 py-20 text-center">
          <h1 className="text-xl font-semibold">Relatório indisponível</h1>
          <p className="mt-3 text-sm text-muted-foreground">{report?.error ?? 'Não foi possível carregar este relatório agora.'}</p>
        </main>
      </div>
    );
  }

  const ads = report.ads ?? [];
  const clicks = report.totals?.clicks ?? 0;
  const spent = report.totals?.spent ?? 0;
  const conversations = report.totals?.conversations ?? 0;
  
  const showClicks = report.configuration?.visibility?.clicks ?? true;
  const showSpent = report.configuration?.visibility?.spent ?? true;
  const showConversations = report.configuration?.visibility?.conversations ?? false;
  const showCardMetrics = (report as any).showCardMetrics ?? true;

  const campaignGroups: CampaignGroup[] = (report as any).campaignGroups ?? Object.values(
    ads.reduce((acc, ad) => {
      const camp = ad.campaign || 'Campanha';
      if (!acc[camp]) {
        acc[camp] = {
          name: camp,
          totals: { clicks: 0, spent: 0, conversations: 0 },
          ads: [],
        };
      }
      acc[camp].ads.push(ad);
      acc[camp].totals.clicks += ad.clicks;
      acc[camp].totals.spent += ad.spent;
      acc[camp].totals.conversations += ad.conversations ?? 0;
      return acc;
    }, {} as Record<string, CampaignGroup>)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="Criativa Marketing Digital" width={44} height={44} className="size-11 rounded-full" />
            <span className="text-[23px] font-extrabold text-primary">criativa<span className="text-accent-brand">.</span></span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium">
            <MetaIcon className="text-primary" size={21} />Meta Ads
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-6 pb-16 pt-9 sm:px-10 sm:pt-11">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />Relatório compartilhado
          </div>
          <h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">{report.title ?? report.campaignName}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{report.campaignName}</p>
        </div>

        {/* TOTAIS GLOBAIS INDEPENDENTES */}
        <section aria-label="Resumo geral dos resultados" className="report-summary my-8 border-y border-border py-7">
          {[
            { label: 'Criativos', value: number(ads.length), icon: LayoutGrid, note: `${ads.filter(ad => ad.status === 'Ativo').length} ativos` },
            ...(showClicks ? [{ label: 'Total de cliques', value: number(clicks), icon: MousePointer2, note: 'Interações gerais com anúncios' }] : []),
            ...(showSpent ? [{ label: 'Investimento total', value: currency(spent), icon: Wallet, note: 'Investimento total consolidado' }] : []),
            ...(showClicks && showSpent ? [{ label: 'Custo por clique', value: currency(clicks ? spent / clicks : 0), icon: CircleDollarSign, note: 'Média geral' }] : []),
            ...(showConversations ? [{ label: 'Conversas iniciadas', value: number(conversations), icon: MessageCircle, note: 'Total de conversas' }] : []),
            ...(showConversations && showSpent ? [{ label: 'Custo por conversa', value: currency(conversations ? spent / conversations : 0), icon: CircleDollarSign, note: 'Investimento ÷ conversas' }] : []),
            ...(report.totals?.custom ?? []).map(indicator => ({
              label: indicator.name,
              value: indicator.format === 'currency' ? currency(indicator.value) : indicator.format === 'percent' ? `${number(Math.round(indicator.value * 100) / 100)}%` : number(indicator.value),
              icon: Sparkles,
              note: 'Indicador personalizado',
            })),
          ].map(item => (
            <div key={item.label}>
              <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
                <item.icon size={15} />{item.label}
              </div>
              <p className="text-[27px] font-semibold leading-none tabular-nums">{item.value}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </section>

        {/* SEÇÕES AGRUPADAS POR CAMPANHA */}
        <div className="space-y-12">
          {campaignGroups.map(group => (
            <section key={group.name} className="rounded-xl border border-border/70 bg-card/40 p-6 sm:p-8">
              <div className="mb-6 flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Layers size={15} />Campanha
                  </div>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{group.name}</h2>
                  <span className="text-xs text-muted-foreground">{group.ads.length} criativos</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {showSpent && (
                    <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Investimento</span>
                      <p className="text-sm font-bold text-foreground tabular-nums">{currency(group.totals.spent)}</p>
                    </div>
                  )}
                  {showClicks && (
                    <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cliques</span>
                      <p className="text-sm font-bold text-foreground tabular-nums">{number(group.totals.clicks)}</p>
                    </div>
                  )}
                  {showConversations && (
                    <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground">Conversas</span>
                      <p className="text-sm font-bold text-foreground tabular-nums">{number(group.totals.conversations)}</p>
                    </div>
                  )}
                </div>
              </div>

              <CampaignGeoMap geo={group.geoLocations ?? mergeGeo(group.ads.map(ad => ad.geo))} />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.ads.map(ad => (
                  <CreativeCard
                    key={ad.id}
                    ad={ad}
                    showClicks={showClicks}
                    showSpent={showSpent}
                    showConversations={showConversations}
                    showCardMetrics={showCardMetrics}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
