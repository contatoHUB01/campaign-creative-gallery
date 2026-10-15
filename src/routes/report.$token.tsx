import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { LayoutGrid, MousePointer2, Wallet, CircleDollarSign, Sparkles, Infinity as MetaIcon } from 'lucide-react';
import { CreativeCard } from '@/components/creative-card';
import { currency, number } from '@/lib/ads';
import { getSharedCampaignReport } from '@/lib/reportLinks.functions';

const sharedReportQuery = (token: string) => queryOptions({
  queryKey: ['shared-campaign-report', token],
  queryFn: () => getSharedCampaignReport({ data: { token } }),
  staleTime: 0,
  refetchOnMount: 'always',
  refetchInterval: 30_000,
  retry: false,
});

export const Route = createFileRoute('/report/$token')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sharedReportQuery(params.token)),
  head: () => ({ meta: [
    { title: 'Relatório de campanha | Criativa' },
    { name: 'description', content: 'Relatório compartilhado de criativos e desempenho de uma campanha Meta Ads.' },
    { property: 'og:title', content: 'Relatório de campanha | Criativa' },
    { property: 'og:description', content: 'Criativos e resultados de campanha em uma visão clara.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SharedCampaignReport,
});

function SharedCampaignReport() {
  const { token } = Route.useParams();
  const { data: report } = useSuspenseQuery(sharedReportQuery(token));
  const ads = report.ads;
  const clicks = report.totals?.clicks ?? 0;
  const spent = report.totals?.spent ?? 0;
  const showClicks = report.configuration?.visibility.clicks ?? true;
  const showSpent = report.configuration?.visibility.spent ?? true;
  return <div className="min-h-screen">
    <header className="border-b border-border bg-card"><div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-6 sm:px-10"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={21} /></span><span className="text-[23px] font-extrabold">criativa<span className="text-primary">.</span></span></div><div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"><MetaIcon className="text-primary" size={21} />Meta Ads</div></div></header>
    <main className="mx-auto max-w-[1240px] px-6 pb-12 pt-9 sm:px-10 sm:pt-11">
      {report.error ? <div className="py-20 text-center" role="alert"><h1 className="text-xl font-semibold">Relatório indisponível</h1><p className="mt-3 text-sm text-muted-foreground">{report.error}</p></div> : <>
        <div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />Relatório compartilhado</div><h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">{report.title ?? report.campaignName}</h1><p className="mt-3 text-sm text-muted-foreground">{report.campaignName}</p></div>
        <section aria-label="Resumo dos resultados" className="report-summary my-8 border-y border-border py-7">{[
          { label: 'Criativos', value: number(ads.length), icon: LayoutGrid, note: `${ads.filter(ad => ad.status === 'Ativo').length} ativos` },
          ...(showClicks ? [{ label: 'Total de cliques', value: number(clicks), icon: MousePointer2, note: 'Interações com os anúncios' }] : []),
          ...(showSpent ? [{ label: 'Investimento total', value: currency(spent), icon: Wallet, note: 'Valor gasto no período' }] : []),
          ...(showClicks && showSpent ? [{ label: 'Custo por clique', value: currency(clicks ? spent / clicks : 0), icon: CircleDollarSign, note: 'Média dos criativos' }] : []),
        ].map(item => <div key={item.label}><div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground"><item.icon size={15} />{item.label}</div><p className="text-[27px] font-semibold leading-none tabular-nums">{item.value}</p><p className="mt-3 text-[11px] text-muted-foreground">{item.note}</p></div>)}</section>
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Criativos da campanha</h2><span className="text-xs text-muted-foreground">{ads.length} anúncios</span></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{ads.map(ad => <CreativeCard key={ad.id} ad={ad} showClicks={showClicks} showSpent={showSpent} />)}</div>
      </>}
    </main>
  </div>;
}