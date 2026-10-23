import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import logo from '@/assets/logo-criativa.png.asset.json';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, SlidersHorizontal, LayoutGrid, MousePointer2, Wallet, CircleDollarSign, Sparkles, Infinity as MetaIcon, MessageCircle, ChevronDown, X, Loader2, Layers, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { CreativeCard } from '@/components/creative-card';
import { currency, number } from '@/lib/ads';
import { metaAdsQueryOptions, signedOutReport, buscarCriativosMeta, ACCOUNT_ID } from '@/lib/metaApi';
import { MetaLogin } from '@/components/meta-login';
import { supabase } from '@/integrations/supabase/client';
import { ReportLinkDialog } from '@/components/report-link-dialog';
import { ReportMetricsPanel, defaultMetrics, type MetricsState } from '@/components/report-metrics-panel';
import { computeIndicator, type ReportConfiguration, type CampaignOverride } from '@/lib/report-configuration';
import type { CampaignReportLink } from '@/lib/reportLinks.functions';

export const Route = createFileRoute('/')({
  beforeLoad: ({ location }) => {
    const token = new URLSearchParams(location.searchStr).get('token');
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      throw redirect({ to: '/report/$token', params: { token }, replace: true });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    status: search['status'] === 'Ativo' || search['status'] === 'Pausado' ? search['status'] : 'Todos',
    campaign: Array.isArray(search['campaign']) ? search['campaign'].filter((name): name is string => typeof name === 'string') : typeof search['campaign'] === 'string' && search['campaign'] !== 'Todas' ? [search['campaign']] : [] as string[],
    sort: search['sort'] === 'clicks' || search['sort'] === 'spent' ? search['sort'] : 'recent',
    since: typeof search['since'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search['since']) ? search['since'] : '',
    until: typeof search['until'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search['until']) ? search['until'] : '',
  }),
  pendingComponent: () => <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground" role="status"><Loader2 className="animate-spin" />Carregando criativos...</div>,
  errorComponent: ReportError,
  notFoundComponent: () => <div className="p-10">Relatório não encontrado.</div>,
  head: () => ({
    meta: [
      { title: 'Criativos | Criativa — Meta Ads' },
      { name: 'description', content: 'Explore os criativos das campanhas Meta Ads e acompanhe cliques, gastos e status em um relatório visual.' },
      { property: 'og:title', content: 'Criativos | Criativa — Meta Ads' },
      { property: 'og:description', content: 'Uma visão clara dos criativos e do desempenho das suas campanhas.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ]
  }),
  component: Index,
});

function ReportError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center" role="alert">
      <h1 className="text-xl font-semibold">Não foi possível carregar os criativos</h1>
      <p className="mt-3 text-sm text-muted-foreground">Verifique sua sessão, o token privado e as permissões na Meta.</p>
      <Button variant="outline" className="mt-5" onClick={() => router.invalidate()}>Tentar novamente</Button>
    </div>
  );
}

function Index() {
  const { status, campaign, sort, since, until } = Route.useSearch();
  const period = since && until && since <= until ? { since, until } : undefined;
  const hasFilters = status !== 'Todos' || campaign.length > 0 || Boolean(since) || Boolean(until);

  const [sessionState, setSessionState] = useState<'checking' | 'in' | 'out'>('checking');
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setSessionState(data.session ? 'in' : 'out'); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') setSessionState('in');
      if (event === 'SIGNED_OUT') setSessionState('out');
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const adsQuery = metaAdsQueryOptions(period, status === 'Ativo');
  const { data: report = signedOutReport, isFetching, isError, refetch } = useQuery({ ...adsQuery, enabled: hasFilters });
  const queryClient = useQueryClient();

  const refreshNow = () => {
    void queryClient.fetchQuery({
      ...adsQuery,
      staleTime: 0,
      queryFn: () => buscarCriativosMeta(ACCOUNT_ID, period, { activeOnly: status === 'Ativo', fresh: true })
    });
  };

  const [metrics, setMetrics] = useState<MetricsState>(defaultMetrics);
  const [showCardMetrics, setShowCardMetrics] = useState<boolean>(true);
  const [campaignOverrides, setCampaignOverrides] = useState<Record<string, CampaignOverride>>({});
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);

  const ads = report.ads;
  const navigate = Route.useNavigate();
  const setStatus = (status: string) => { void navigate({ search: previous => ({ ...previous, status }), replace: true }); };
  const setCampaign = (campaign: string[]) => { void navigate({ search: previous => ({ ...previous, campaign }), replace: true }); };
  const setSort = (sort: string) => { void navigate({ search: previous => ({ ...previous, sort }), replace: true }); };
  const setSince = (since: string) => { void navigate({ search: previous => ({ ...previous, since }), replace: true }); };
  const setUntil = (until: string) => { void navigate({ search: previous => ({ ...previous, until }), replace: true }); };

  const campaigns = [...new Set(ads.map(ad => ad.campaign))];
  const visible = ads
    .filter(ad => (status === 'Todos' || ad.status === status) && (!campaign.length || campaign.includes(ad.campaign)))
    .sort((a, b) => sort === 'clicks' ? b.clicks - a.clicks : sort === 'spent' ? b.spent - a.spent : 0);

  const toggleCampaign = (name: string) => setCampaign(campaign.includes(name) ? campaign.filter(item => item !== name) : [...campaign, name]);
  const invalidPeriod = Boolean(since && until && since > until);
  const reset = () => { void navigate({ search: previous => ({ ...previous, status: 'Todos', campaign: [], since: '', until: '' }), replace: true }); };
  const reportCampaigns = campaign.length ? campaign : campaigns;

  // Montagem da configuração oficial para geração do link
  const reportConfiguration: ReportConfiguration | null = report.connected && reportCampaigns.length ? {
    campaigns: reportCampaigns,
    adIds: selectedAds.filter(id => visible.some(ad => String(ad.id) === id)),
    statuses: status === 'Todos' ? ['Ativo', 'Pausado'] : [status as 'Ativo' | 'Pausado'],
    period,
    filters: { q: '', sort: sort as 'recent' | 'clicks' | 'spent' },
    visibility: { clicks: metrics.showClicks, spent: metrics.showSpent, conversations: metrics.showConversations },
    showCardMetrics,
    overrides: {
      ...(metrics.clicksOverride === '' ? {} : { clicks: Math.round(Number(metrics.clicksOverride)) }),
      ...(metrics.spentOverride === '' ? {} : { spent: Number(metrics.spentOverride) })
    },
    campaignOverrides,
    customIndicators: metrics.indicators.filter(item => item.name.trim()),
  } : null;

  const reportAds = selectedAds.length ? visible.filter(ad => selectedAds.includes(String(ad.id))) : visible;

  // Totais do Topo (Consolidados Globais Independentes)
  const shownClicks = metrics.clicksOverride === '' ? reportAds.reduce((s, ad) => s + ad.clicks, 0) : Number(metrics.clicksOverride);
  const shownSpent = metrics.spentOverride === '' ? reportAds.reduce((s, ad) => s + ad.spent, 0) : Number(metrics.spentOverride);
  const shownConversations = reportAds.reduce((s, ad) => s + (ad.conversations ?? 0), 0);

  const toggleAd = (id: string) => setSelectedAds(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  function loadVersion(link: CampaignReportLink) {
    const c = link.configuration;
    setEditing({ id: link.id, title: link.title });
    setSelectedAds(c.adIds);
    setShowCardMetrics(c.showCardMetrics ?? true);
    setCampaignOverrides(c.campaignOverrides ?? {});
    setMetrics({
      showClicks: c.visibility.clicks,
      showSpent: c.visibility.spent,
      showConversations: c.visibility.conversations,
      clicksOverride: c.overrides?.clicks?.toString() ?? '',
      spentOverride: c.overrides?.spent?.toString() ?? '',
      indicators: c.customIndicators ?? []
    });
    void navigate({
      search: previous => ({
        ...previous,
        sort: c.filters.sort,
        campaign: c.campaigns,
        status: c.statuses.length === 1 ? (c.statuses[0] ?? 'Todos') : 'Todos',
        since: c.period?.since ?? '',
        until: c.period?.until ?? ''
      }),
      replace: true
    });
  }

  function handleCampaignOverrideChange(campName: string, field: 'clicks' | 'spend' | 'conversations', value: string) {
    setCampaignOverrides(prev => {
      const current = prev[campName] || {};
      const numVal = value.trim() === '' ? undefined : Number(value);
      return {
        ...prev,
        [campName]: {
          ...current,
          [field]: numVal !== undefined && !isNaN(numVal) ? numVal : undefined
        }
      };
    });
  }

  // Agrupamento por Campanha no Dashboard
  const activeCampaigns = reportCampaigns.filter(name => visible.some(ad => ad.campaign === name));

  if (sessionState === 'checking') {
    return <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground" role="status"><Loader2 className="animate-spin" />Carregando criativos...</div>;
  }

  if (sessionState === 'out' || (hasFilters && !isFetching && !isError && report.requiresLogin)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="flex items-center gap-2 text-3xl font-extrabold">
          <img src={logo.url} alt="Criativa Marketing Digital" width={120} height={120} className="size-28 rounded-full" />
        </div>
        <MetaLogin />
      </main>
    );
  }

  function exportReport() {
    const previous = document.title;
    document.title = (editing?.title ?? 'relatorio-criativos').replace(/[^\w\-]+/g, '_');
    window.print();
    document.title = previous;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-6 sm:px-10">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="Criativa Marketing Digital" width={44} height={44} className="size-11 rounded-full" />
            <span className="text-[23px] font-extrabold text-primary">criativa<span className="text-accent-brand">.</span></span>
            <span className="mx-5 hidden h-6 border-l border-border sm:block" />
            <span className="hidden text-sm font-medium text-muted-foreground sm:block">Relatório de anúncios</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { void supabase.auth.signOut(); }}>Sair</Button>
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium">
              <MetaIcon className="text-primary" size={21} />Meta Ads
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-6 pb-16 pt-9 sm:px-10 sm:pt-11">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />Visão de criativos
            </div>
            <h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">Criativos que contam histórias.</h1>
            <p className="mt-3 text-sm text-muted-foreground">Uma visão clara dos seus anúncios e dos resultados de cada ideia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {editing && (
              <span className="rounded-md bg-accent px-2 py-1 text-xs text-primary">
                Editando: {editing.title}
                <button type="button" aria-label="Sair da edição" className="ml-1 font-bold" onClick={() => setEditing(null)}>×</button>
              </span>
            )}
            <Button variant="outline" className="bg-card" onClick={exportReport} disabled={!report.connected || isFetching}>
              <ArrowDownToLine size={15} />Exportar PDF
            </Button>
            <ReportLinkDialog configuration={reportConfiguration} editing={editing} onEdit={loadVersion} onSaved={setEditing} />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-7 print:hidden flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className={`rounded border px-2 py-1 font-medium ${report.connected ? 'api-connected' : 'border-border bg-card'}`}>
              {report.connected ? 'Ligado à API' : 'API não conectada'}
            </span>
            {report.connected && <span>Anúncios, campanhas e métricas da Meta</span>}
            {report.connected && (
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={refreshNow} disabled={isFetching}>
                Atualizar agora
              </Button>
            )}
          </div>
        )}

        {/* TOTAIS GLOBAIS INDEPENDENTES */}
        {hasFilters && (
          <section aria-label="Resumo dos resultados" className="report-summary my-8 border-y border-border py-7">
            {[
              { label: 'Criativos no relatório', value: number(reportAds.length), icon: LayoutGrid, note: `${reportAds.filter(ad => ad.status === 'Ativo').length} ativos no período` },
              ...(metrics.showClicks ? [{ label: 'Total de cliques', value: number(shownClicks), icon: MousePointer2, note: metrics.clicksOverride ? 'Valor ajustado manualmente' : 'Interações com os anúncios' }] : []),
              ...(metrics.showSpent ? [{ label: 'Investimento total', value: currency(shownSpent), icon: Wallet, note: metrics.spentOverride ? 'Valor ajustado manualmente' : 'Valor gasto no período' }] : []),
              ...(metrics.showClicks && metrics.showSpent ? [{ label: 'Custo por clique', value: currency(shownClicks ? shownSpent / shownClicks : 0), icon: CircleDollarSign, note: 'Média entre os criativos' }] : []),
              ...(metrics.showConversations ? [{ label: 'Conversas iniciadas', value: number(shownConversations), icon: MessageCircle, note: 'Conversas por mensagem' }] : []),
              ...(metrics.showConversations && metrics.showSpent ? [{ label: 'Custo por conversa', value: currency(shownConversations ? shownSpent / shownConversations : 0), icon: CircleDollarSign, note: 'Investimento ÷ conversas' }] : []),
              ...metrics.indicators.filter(i => i.name.trim()).map(i => {
                const v = computeIndicator(i, { clicks: shownClicks, spent: shownSpent, conversations: shownConversations });
                return { label: i.name, value: i.format === 'currency' ? currency(v) : i.format === 'percent' ? `${number(Math.round(v * 100) / 100)}%` : number(v), icon: Sparkles, note: 'Indicador personalizado' };
              }),
            ].map(item => (
              <div key={item.label}>
                <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground"><item.icon size={15} />{item.label}</div>
                <p className="text-[27px] font-semibold leading-none tabular-nums">{item.value}</p>
                <p className="mt-3 text-[11px] text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </section>
        )}

        {/* CONTROLES E CONFIGURAÇÕES */}
        {hasFilters && report.connected && (
          <div className="print:hidden space-y-4 mb-6">
            <ReportMetricsPanel value={metrics} onChange={setMetrics} />
            
            {/* SWITCH: EXIBIR MÉTRICAS INDIVIDUAIS NOS CRIATIVOS */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div className="space-y-0.5">
                <label htmlFor="card-metrics-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                  Exibir métricas individuais nos criativos
                </label>
                <p className="text-xs text-muted-foreground">
                  Quando desativado, oculta os valores de investimento, cliques e conversas no rodapé dos cartões.
                </p>
              </div>
              <Switch
                id="card-metrics-toggle"
                checked={showCardMetrics}
                onCheckedChange={setShowCardMetrics}
              />
            </div>
          </div>
        )}

        {/* BARRA DE FILTROS LIMPA (SEM CAMPO DE BUSCA TEXTUAL) */}
        <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" aria-label="Filtrar campanhas" className="h-10 w-[240px] justify-between bg-card text-xs font-normal">
                <span className="truncate">{campaign.length === 0 ? 'Todas as campanhas' : campaign.length === 1 ? campaign[0] : `${campaign.length} campanhas`}</span>
                <ChevronDown size={14} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[320px] p-2">
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {campaigns.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhuma campanha.</p>}
                {campaigns.map(name => (
                  <label key={name} className="flex cursor-pointer items-start gap-2 rounded p-2 text-xs hover:bg-accent">
                    <Checkbox checked={campaign.includes(name)} onCheckedChange={() => toggleCampaign(name)} />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              {campaign.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-1 w-full text-xs" onClick={() => setCampaign([])}>
                  Selecionar todas as campanhas
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filtrar status" className="h-10 w-[145px] bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os status</SelectItem>
              <SelectItem value="Ativo">Ativos</SelectItem>
              <SelectItem value="Pausado">Pausados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger aria-label="Ordenar criativos" className="h-10 w-[165px] bg-card text-xs">
              <SlidersHorizontal size={13} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="clicks">Mais cliques</SelectItem>
              <SelectItem value="spent">Maior gasto</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-1">
              De
              <input type="date" aria-label="Data inicial" value={since} max={until || undefined} onChange={event => setSince(event.target.value)} className="h-10 rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </label>
            <label className="flex items-center gap-1">
              até
              <input type="date" aria-label="Data final" value={until} min={since || undefined} onChange={event => setUntil(event.target.value)} className="h-10 rounded-md border border-input bg-card px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </label>
          </div>

          {invalidPeriod && <span className="text-xs text-destructive" role="alert">A data final deve ser posterior à inicial.</span>}
          {hasFilters && <Button variant="ghost" size="icon" aria-label="Limpar filtros" title="Limpar filtros" onClick={reset}><X /></Button>}
        </div>

        {/* CONTEÚDO PRINCIPAL: AGRUPAMENTO POR CAMPANHA */}
        {hasFilters ? (
          <>
            {isFetching && <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground" role="status"><Loader2 className="animate-spin" />Carregando criativos...</div>}
            {!isFetching && isError && (
              <div className="flex min-h-[280px] items-center justify-center px-6 text-center" role="alert">
                <p className="max-w-xl text-sm font-medium text-foreground">Falha ao conectar com o Servidor Seguro. Abra as Ferramentas de Programador (F12) para ver o erro no Console.</p>
              </div>
            )}
            {!isFetching && !isError && report.requiresLogin && <MetaLogin />}
            {!isFetching && !isError && report.error && !report.requiresLogin && (
              <div className="py-12 text-center" role="alert">
                <h3 className="font-semibold">Não foi possível carregar os criativos</h3>
                <p className="mt-2 text-sm text-muted-foreground">{report.error}</p>
                <Button variant="outline" className="mt-5" onClick={() => { void refetch(); }}>Tentar novamente</Button>
              </div>
            )}

            {!isFetching && !isError && !report.error && visible.length > 0 && (
              <div className="space-y-12">
                {activeCampaigns.map(campName => {
                  const campAds = visible.filter(ad => ad.campaign === campName);
                  const override = campaignOverrides[campName] || {};
                  const rawClicks = campAds.reduce((sum, a) => sum + a.clicks, 0);
                  const rawSpent = campAds.reduce((sum, a) => sum + a.spent, 0);
                  const rawConversations = campAds.reduce((sum, a) => sum + (a.conversations ?? 0), 0);

                  const displaySpent = override.spend !== undefined ? override.spend : rawSpent;
                  const displayClicks = override.clicks !== undefined ? override.clicks : rawClicks;
                  const displayConversations = override.conversations !== undefined ? override.conversations : rawConversations;

                  return (
                    <section key={campName} className="rounded-xl border border-border/70 bg-card/40 p-6 sm:p-8">
                      {/* Cabeçalho do Bloco de Campanha */}
                      <div className="mb-6 space-y-4 border-b border-border/60 pb-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                              <Layers size={15} />Campanha
                            </div>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{campName}</h2>
                            <span className="text-xs text-muted-foreground">{campAds.length} criativos</span>
                          </div>

                          {/* Subtotais da Campanha */}
                          <div className="flex flex-wrap items-center gap-3">
                            {metrics.showSpent && (
                              <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Investimento</span>
                                <p className="text-sm font-bold text-foreground tabular-nums">{currency(displaySpent)}</p>
                              </div>
                            )}
                            {metrics.showClicks && (
                              <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Cliques</span>
                                <p className="text-sm font-bold text-foreground tabular-nums">{number(displayClicks)}</p>
                              </div>
                            )}
                            {metrics.showConversations && (
                              <div className="rounded-lg border border-border bg-background px-3.5 py-2 text-left">
                                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Conversas</span>
                                <p className="text-sm font-bold text-foreground tabular-nums">{number(displayConversations)}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* INPUTS DE AJUSTE MANUAL POR CAMPANHA (OVERRIDES) */}
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-background/50 p-3 print:hidden">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Sliders size={13} />Ajustes Manuais da Campanha:
                          </span>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Gasto R$:</span>
                            <Input
                              type="number"
                              placeholder={rawSpent.toFixed(2)}
                              value={override.spend ?? ''}
                              onChange={e => handleCampaignOverrideChange(campName, 'spend', e.target.value)}
                              className="h-8 w-28 text-xs bg-card"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Cliques:</span>
                            <Input
                              type="number"
                              placeholder={String(rawClicks)}
                              value={override.clicks ?? ''}
                              onChange={e => handleCampaignOverrideChange(campName, 'clicks', e.target.value)}
                              className="h-8 w-24 text-xs bg-card"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Conversas:</span>
                            <Input
                              type="number"
                              placeholder={String(rawConversations)}
                              value={override.conversations ?? ''}
                              onChange={e => handleCampaignOverrideChange(campName, 'conversations', e.target.value)}
                              className="h-8 w-24 text-xs bg-card"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Grade de Criativos Pertencentes a esta Campanha */}
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {campAds.map(ad => (
                          <div
                            key={ad.id}
                            className={`space-y-2 break-inside-avoid ${selectedAds.length && !selectedAds.includes(String(ad.id)) ? 'opacity-50 print:hidden' : ''}`}
                          >
                            <label className="flex items-center gap-2 text-xs font-medium print:hidden">
                              <Checkbox checked={selectedAds.includes(String(ad.id))} onCheckedChange={() => toggleAd(String(ad.id))} />
                              Escolher para o relatório
                            </label>
                            <CreativeCard
                              ad={ad}
                              showClicks={metrics.showClicks}
                              showSpent={metrics.showSpent}
                              showConversations={metrics.showConversations}
                              showCardMetrics={showCardMetrics}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {!isFetching && !isError && !report.error && visible.length === 0 && (
              <div className="py-20 text-center">
                <h3 className="font-semibold">Nenhum criativo encontrado</h3>
                <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros de status, campanhas ou datas.</p>
                <Button variant="outline" className="mt-5" onClick={reset}>Limpar filtros</Button>
              </div>
            )}
          </>
        ) : (
          <section className="my-10 flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center">
            <SlidersHorizontal className="text-muted-foreground" size={26} />
            <h2 className="mt-4 text-lg font-bold">Comece aplicando os filtros</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Escolha o período, as campanhas ou o status para consultar os criativos. Nada é carregado da Meta até você definir os filtros.</p>
          </section>
        )}

        <footer className="mt-8 print:hidden flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[11px] text-muted-foreground">
          <span>Exibindo {visible.length} de {ads.length} criativos</span>
          <span className="flex items-center gap-1">Cada ideia, um novo resultado.<ArrowUpRight size={13} className="text-primary" /></span>
        </footer>
      </main>
    </div>
  );
}
