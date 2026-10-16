import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpRight, Search, SlidersHorizontal, LayoutGrid, MousePointer2, Wallet, CircleDollarSign, Sparkles, Infinity as MetaIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreativeCard } from '@/components/creative-card';
import { currency, number } from '@/lib/ads';
import { metaAdsQueryOptions, signedOutReport } from '@/lib/metaApi';
import { MetaLogin } from '@/components/meta-login';
import { supabase } from '@/integrations/supabase/client';
import { ReportLinkDialog } from '@/components/report-link-dialog';

export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => {
    const token = new URLSearchParams(location.searchStr).get('token');
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      throw redirect({ to: '/report/$token', params: { token }, replace: true });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === 'string' ? search['q'] : '',
    status: search['status'] === 'Ativo' || search['status'] === 'Pausado' ? search['status'] : 'Todos',
    campaign: typeof search['campaign'] === 'string' ? search['campaign'] : 'Todas',
    sort: search['sort'] === 'clicks' || search['sort'] === 'spent' ? search['sort'] : 'recent',
    since: typeof search['since'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search['since']) ? search['since'] : '',
    until: typeof search['until'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search['until']) ? search['until'] : '',
  }),
  pendingComponent: () => <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground" role="status"><Loader2 className="animate-spin" />Carregando criativos...</div>,
  errorComponent: ReportError,
  notFoundComponent: () => <div className="p-10">Relatório não encontrado.</div>,
  head: () => ({ meta: [
    { title: 'Criativos | Criativa — Meta Ads' },
    { name: 'description', content: 'Explore os criativos das campanhas Meta Ads e acompanhe cliques, gastos e status em um relatório visual.' },
    { property: 'og:title', content: 'Criativos | Criativa — Meta Ads' },
    { property: 'og:description', content: 'Uma visão clara dos criativos e do desempenho das suas campanhas.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

function ReportError() {
  const router = useRouter();
  return <div className="mx-auto max-w-lg px-6 py-20 text-center" role="alert"><h1 className="text-xl font-semibold">Não foi possível carregar os criativos</h1><p className="mt-3 text-sm text-muted-foreground">Verifique sua sessão, o token privado e as permissões na Meta.</p><Button variant="outline" className="mt-5" onClick={() => router.invalidate()}>Tentar novamente</Button></div>;
}

function Index() {
  const { q: search, status, campaign, sort, since, until } = Route.useSearch();
  const period = since && until && since <= until ? { since, until } : undefined;
  const { data: report = signedOutReport, isFetching, isError, refetch } = useQuery(metaAdsQueryOptions(period));
  const ads = report.ads;
  const navigate = Route.useNavigate();
  const setSearch = (q: string) => { void navigate({ search: previous => ({ ...previous, q }), replace: true }); };
  const setStatus = (status: string) => { void navigate({ search: previous => ({ ...previous, status }), replace: true }); };
  const setCampaign = (campaign: string) => { void navigate({ search: previous => ({ ...previous, campaign }), replace: true }); };
  const setSort = (sort: string) => { void navigate({ search: previous => ({ ...previous, sort }), replace: true }); };
  const setSince = (since: string) => { void navigate({ search: previous => ({ ...previous, since }), replace: true }); };
  const setUntil = (until: string) => { void navigate({ search: previous => ({ ...previous, until }), replace: true }); };
  const campaigns = [...new Set(ads.map(ad => ad.campaign))];
  const visible = ads.filter(ad => (status === 'Todos' || ad.status === status) && (campaign === 'Todas' || ad.campaign === campaign) && `${ad.title} ${ad.copy} ${ad.campaign}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a, b) => sort === 'clicks' ? b.clicks - a.clicks : sort === 'spent' ? b.spent - a.spent : 0);
  const clicks = visible.reduce((sum, ad) => sum + ad.clicks, 0);
  const spent = visible.reduce((sum, ad) => sum + ad.spent, 0);
  const filtered = search || status !== 'Todos' || campaign !== 'Todas' || since || until;
  const invalidPeriod = Boolean(since && until && since > until);
  const reset = () => { void navigate({ search: previous => ({ ...previous, q: '', status: 'Todos', campaign: 'Todas', since: '', until: '' }), replace: true }); };
  if (!isFetching && !isError && report.requiresLogin) {
    return <main className="flex min-h-screen flex-col items-center justify-center px-6"><div className="flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="text-primary" />criativa<span className="text-primary">.</span></div><MetaLogin /></main>;
  }
  function exportReport() {
    const rows = [['Campanha', 'Título', 'Copy', 'Formato', 'Cliques', 'Valor gasto (BRL)', 'Status'], ...visible.map(ad => [ad.campaign, ad.title, ad.copy, ad.format, String(ad.clicks), ad.spent.toFixed(2), ad.status])];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'relatorio-criativos.csv'; link.click(); URL.revokeObjectURL(url);
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles size={21} /></span><span className="text-[23px] font-extrabold">criativa<span className="text-primary">.</span></span><span className="mx-5 hidden h-6 border-l border-border sm:block" /><span className="hidden text-sm font-medium text-muted-foreground sm:block">Relatório de anúncios</span></div>
           <div className="flex items-center gap-3">{report.connected && <Button variant="ghost" size="sm" onClick={() => { void supabase.auth.signOut(); }}>Sair</Button>}<div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"><MetaIcon className="text-primary" size={21} />Meta Ads</div></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-6 pb-12 pt-9 sm:px-10 sm:pt-11">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div><div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />Visão de criativos</div><h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">Criativos que contam histórias.</h1><p className="mt-3 text-sm text-muted-foreground">Uma visão clara dos seus anúncios e dos resultados de cada ideia.</p></div>
          <div className="flex flex-wrap gap-2">{report.connected && <ReportLinkDialog ads={ads} filters={{ q: search, status, campaign, sort }} />}<Button variant="outline" className="bg-card" onClick={exportReport} disabled={!report.connected || isFetching}><ArrowDownToLine />Exportar relatório</Button></div>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className={`rounded border px-2 py-1 font-medium ${report.connected ? 'api-connected' : 'border-border bg-card'}`}>{report.connected ? 'Ligado à API' : 'API não conectada'}</span>{report.connected && <span>Anúncios, campanhas e métricas da Meta</span>}</div>
        <section aria-label="Resumo dos resultados" className="report-summary my-8 border-y border-border py-7">
          {[
            { label: 'Criativos no relatório', value: number(visible.length), icon: LayoutGrid, note: `${visible.filter(ad => ad.status === 'Ativo').length} ativos no período` },
            { label: 'Total de cliques', value: number(clicks), icon: MousePointer2, note: 'Interações com os anúncios' },
            { label: 'Investimento total', value: currency(spent), icon: Wallet, note: 'Valor gasto no período' },
            { label: 'Custo por clique', value: currency(clicks ? spent / clicks : 0), icon: CircleDollarSign, note: 'Média entre os criativos' },
          ].map(item => <div key={item.label}><div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground"><item.icon size={15} />{item.label}</div><p className="text-[27px] font-semibold leading-none tabular-nums">{item.value}</p><p className="mt-3 text-[11px] text-muted-foreground">{item.note}</p></div>)}
        </section>
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold">Todos os criativos <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-primary">{visible.length}</span></h2><span className="flex items-center gap-1 text-[11px] text-muted-foreground"><LayoutGrid size={13} />Galeria de anúncios</span></div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><input aria-label="Buscar criativos" placeholder="Buscar por título ou campanha..." value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card pl-10 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring" /></div>
          <Select value={campaign} onValueChange={setCampaign}><SelectTrigger aria-label="Filtrar campanha" className="h-10 w-[190px] bg-card text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todas">Todas as campanhas</SelectItem>{campaigns.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>
          <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filtrar status" className="h-10 w-[145px] bg-card text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos os status</SelectItem><SelectItem value="Ativo">Ativos</SelectItem><SelectItem value="Pausado">Pausados</SelectItem></SelectContent></Select>
          <Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Ordenar criativos" className="h-10 w-[165px] bg-card text-xs"><SlidersHorizontal size={13} /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">Mais recentes</SelectItem><SelectItem value="clicks">Mais cliques</SelectItem><SelectItem value="spent">Maior gasto</SelectItem></SelectContent></Select>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><label className="flex items-center gap-1">De<input type="date" aria-label="Data inicial" value={since} max={until || undefined} onChange={event => setSince(event.target.value)} className="h-10 rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" /></label><label className="flex items-center gap-1">até<input type="date" aria-label="Data final" value={until} min={since || undefined} onChange={event => setUntil(event.target.value)} className="h-10 rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" /></label></div>
          {invalidPeriod && <span className="text-xs text-destructive" role="alert">A data final deve ser posterior à inicial.</span>}
          {filtered && <Button variant="ghost" size="icon" aria-label="Limpar filtros" title="Limpar filtros" onClick={reset}><X /></Button>}
        </div>
        {isFetching && <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status"><Loader2 className="animate-spin" />Carregando criativos...</div>}
        {!isFetching && isError && <div className="flex min-h-[280px] items-center justify-center px-6 text-center" role="alert"><p className="max-w-xl text-sm font-medium text-foreground">Falha ao conectar com o Servidor Seguro. Abra as Ferramentas de Programador (F12) para ver o erro no Console.</p></div>}
        {!isFetching && !isError && report.requiresLogin && <MetaLogin />}
        {!isFetching && !isError && report.error && !report.requiresLogin && <div className="py-12 text-center" role="alert"><h3 className="font-semibold">Não foi possível carregar os criativos</h3><p className="mt-2 text-sm text-muted-foreground">{report.error}</p><Button variant="outline" className="mt-5" onClick={() => { void refetch(); }}>Tentar novamente</Button></div>}
        {!isFetching && !isError && !report.error && <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map(ad => <CreativeCard key={ad.id} ad={ad} />)}</div>}
        {!isFetching && !isError && !report.error && visible.length === 0 && <div className="py-20 text-center"><Search className="mx-auto mb-3 text-muted-foreground" size={28} /><h3 className="font-semibold">Nenhum criativo encontrado</h3><p className="mt-2 text-sm text-muted-foreground">{filtered ? 'Tente outro termo ou ajuste os filtros.' : 'A Meta não retornou criativos para esta conta.'}</p>{filtered && <Button variant="outline" className="mt-5" onClick={reset}>Limpar filtros</Button>}</div>}
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[11px] text-muted-foreground"><span>Exibindo {visible.length} de {ads.length} criativos</span><span className="flex items-center gap-1">Cada ideia, um novo resultado.<ArrowUpRight size={13} className="text-primary" /></span></footer>
      </main>
    </div>
  );
}
