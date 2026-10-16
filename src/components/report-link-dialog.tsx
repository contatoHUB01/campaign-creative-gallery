import { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Loader2, Pencil, Share2, Trash2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ACCOUNT_ID } from '@/lib/metaApi';
import type { Ad } from '@/lib/ads';
import { createCampaignReportLink, listCampaignReportLinks, revokeCampaignReportLink, updateCampaignReportLink, type CampaignReportLink, type ReportConfiguration } from '@/lib/reportLinks.functions';

type CurrentFilters = { q: string; status: string; campaign: string[]; sort: string };

export function ReportLinkDialog({ ads, filters }: { ads: Ad[]; filters: CurrentFilters }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const listLinks = useServerFn(listCampaignReportLinks);
  const createLink = useServerFn(createCampaignReportLink);
  const updateLink = useServerFn(updateCampaignReportLink);
  const revokeLink = useServerFn(revokeCampaignReportLink);
  const campaigns = useMemo(() => [...new Set(ads.map(ad => ad.campaign))], [ads]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'content' | 'metrics' | 'link'>('content');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('Relatório de campanhas');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(filters.campaign.length ? filters.campaign : campaigns);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Array<'Ativo' | 'Pausado'>>(filters.status === 'Ativo' || filters.status === 'Pausado' ? [filters.status] : ['Ativo', 'Pausado']);
  const [since, setSince] = useState(monthAgo);
  const [until, setUntil] = useState(today);
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);
  const [savedFilters, setSavedFilters] = useState<ReportConfiguration['filters'] | null>(null);
  const [showClicks, setShowClicks] = useState(true);
  const [showSpent, setShowSpent] = useState(true);
  const [showConversations, setShowConversations] = useState(true);
  const [clicksOverride, setClicksOverride] = useState('');
  const [spentOverride, setSpentOverride] = useState('');
  const [links, setLinks] = useState<CampaignReportLink[]>([]);
  const [createdUrl, setCreatedUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) void listLinks().then(setLinks).catch(() => setError('Não foi possível carregar os relatórios.')); }, [listLinks, open]);

  const eligibleAds = ads.filter(ad => selectedCampaigns.includes(ad.campaign) && statuses.includes(ad.status));
  const configuration = (): ReportConfiguration => ({
    campaigns: selectedCampaigns,
    adIds: selectedAds,
    statuses,
    period: since && until ? { since, until } : undefined,
    filters: savedFilters ?? { q: useCurrentFilters ? filters.q : '', sort: useCurrentFilters && ['clicks', 'spent'].includes(filters.sort) ? filters.sort as 'clicks' | 'spent' : 'recent' },
    visibility: { clicks: showClicks, spent: showSpent, conversations: showConversations },
    overrides: {
      ...(clicksOverride === '' ? {} : { clicks: Number(clicksOverride) }),
      ...(spentOverride === '' ? {} : { spent: Number(spentOverride) }),
    },
  });

  function resetBuilder() {
    setEditingId(null); setTitle('Relatório de campanhas'); setSelectedCampaigns(campaigns); setSelectedAds([]); setStatuses(['Ativo', 'Pausado']);
    setSince(monthAgo); setUntil(today); setUseCurrentFilters(true); setSavedFilters(null); setShowClicks(true); setShowSpent(true); setClicksOverride(''); setSpentOverride(''); setCreatedUrl(''); setStep('content');
  }

  function editReport(link: CampaignReportLink) {
    setEditingId(link.id); setTitle(link.title); setSelectedCampaigns(link.configuration.campaigns); setSelectedAds(link.configuration.adIds); setStatuses(link.configuration.statuses);
    setSince(link.configuration.period?.since ?? ''); setUntil(link.configuration.period?.until ?? ''); setUseCurrentFilters(Boolean(link.configuration.filters.q || link.configuration.filters.sort !== 'recent'));
    setSavedFilters(link.configuration.filters);
    setShowClicks(link.configuration.visibility.clicks); setShowSpent(link.configuration.visibility.spent); setShowConversations(link.configuration.visibility.conversations); setClicksOverride(link.configuration.overrides.clicks?.toString() ?? ''); setSpentOverride(link.configuration.overrides.spent?.toString() ?? ''); setCreatedUrl(''); setStep('content');
  }

  async function saveReport() {
    if (!title.trim() || selectedCampaigns.length === 0 || statuses.length === 0 || pending) return;
    if (!since || !until || since > until) { setError('Selecione um período válido.'); return; }
    setPending(true); setError('');
    try {
      if (editingId) {
        await updateLink({ data: { id: editingId, title, configuration: configuration() } });
      } else {
        const result = await createLink({ data: { accountId: ACCOUNT_ID, title, configuration: configuration() } });
        setEditingId(result.id);
        setCreatedUrl(`${window.location.origin}/report/${result.token}`);
      }
      setLinks(await listLinks()); setStep('link');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar o relatório.');
    } finally { setPending(false); }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeLink({ data: { id } });
      setLinks(current => current.map(link => link.id === id ? { ...link, revokedAt: new Date().toISOString() } : link));
    } catch { setError('Não foi possível revogar o link.'); }
  }

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => set(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="bg-card"><Share2 />Construir relatório</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader><DialogTitle>Construtor de relatório</DialogTitle><DialogDescription>Escolha o conteúdo, controle as métricas e gere um link único sem expiração.</DialogDescription></DialogHeader>
      <div className="flex border-b border-border text-xs font-medium">
        {([['content', '1. Conteúdo'], ['metrics', '2. Métricas'], ['link', '3. Link']] as const).map(([value, label]) => <Button key={value} type="button" variant="ghost" disabled={value === 'link' && !editingId} onClick={() => setStep(value)} className={`h-11 flex-1 rounded-none border-b-2 px-2 text-xs ${step === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{label}</Button>)}
      </div>

      {step === 'content' && <div className="space-y-5">
        <div><label htmlFor="report-title" className="mb-2 block text-xs font-medium">Nome do relatório</label><Input id="report-title" value={title} onChange={event => setTitle(event.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="report-since" className="mb-2 block text-xs font-medium">Data inicial</label><Input id="report-since" type="date" value={since} max={until || today} onChange={event => setSince(event.target.value)} /></div><div><label htmlFor="report-until" className="mb-2 block text-xs font-medium">Data final</label><Input id="report-until" type="date" value={until} min={since} max={today} onChange={event => setUntil(event.target.value)} /></div></div>
        <fieldset><legend className="mb-2 text-xs font-medium">Campanhas</legend><div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">{campaigns.map(name => <label key={name} className="flex items-start gap-2 text-xs"><Checkbox checked={selectedCampaigns.includes(name)} onCheckedChange={() => toggle(selectedCampaigns, name, setSelectedCampaigns)} /><span>{name}</span></label>)}</div></fieldset>
        <fieldset><legend className="mb-2 text-xs font-medium">Status</legend><div className="flex gap-5">{(['Ativo', 'Pausado'] as const).map(value => <label key={value} className="flex items-center gap-2 text-xs"><Checkbox checked={statuses.includes(value)} onCheckedChange={() => toggle(statuses, value, setStatuses)} />{value}</label>)}</div></fieldset>
        <fieldset><legend className="mb-2 text-xs font-medium">Anúncios</legend><p className="mb-2 text-xs text-muted-foreground">Sem seleção, todos os anúncios das campanhas escolhidas serão incluídos.</p><div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-2">{eligibleAds.map(ad => <label key={ad.id} className="flex items-start gap-2 text-xs"><Checkbox checked={selectedAds.includes(String(ad.id))} onCheckedChange={() => toggle(selectedAds, String(ad.id), setSelectedAds)} /><span>{ad.title}</span></label>)}</div></fieldset>
        <label className="flex items-center gap-2 text-xs"><Checkbox checked={useCurrentFilters} onCheckedChange={value => { setUseCurrentFilters(Boolean(value)); setSavedFilters(null); }} />Usar a pesquisa e a ordenação atuais</label>
        <div className="flex justify-end"><Button onClick={() => setStep('metrics')} disabled={!title.trim() || selectedCampaigns.length === 0 || statuses.length === 0}>Continuar</Button></div>
      </div>}

      {step === 'metrics' && <div className="space-y-5">
        <fieldset><legend className="mb-3 text-xs font-medium">Dados visíveis para o cliente</legend><div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Checkbox checked={showClicks} onCheckedChange={value => setShowClicks(Boolean(value))} />Cliques</label><label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Checkbox checked={showSpent} onCheckedChange={value => setShowSpent(Boolean(value))} />Investimento</label><label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Checkbox checked={showConversations} onCheckedChange={value => setShowConversations(Boolean(value))} />Conversas e custo por conversa</label></div></fieldset>
        <div><h3 className="text-xs font-medium">Ajustes manuais dos totais</h3><p className="mt-1 text-xs text-muted-foreground">Deixe em branco para usar os valores reais da Meta. O dado original não será alterado.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><div><label htmlFor="clicks-override" className="mb-2 block text-xs">Total de cliques</label><Input id="clicks-override" type="number" min="0" value={clicksOverride} onChange={event => setClicksOverride(event.target.value)} placeholder="Valor real" /></div><div><label htmlFor="spent-override" className="mb-2 block text-xs">Investimento total</label><Input id="spent-override" type="number" min="0" step="0.01" value={spentOverride} onChange={event => setSpentOverride(event.target.value)} placeholder="Valor real" /></div></div></div>
        <div className="flex justify-between"><Button variant="outline" onClick={() => setStep('content')}>Voltar</Button><Button onClick={() => { void saveReport(); }} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Link2 />}{editingId ? 'Atualizar relatório' : 'Gerar link único'}</Button></div>
      </div>}

      {step === 'link' && <div className="space-y-5">
        <div className="rounded-md border border-border bg-muted p-4"><h3 className="text-sm font-semibold">{editingId && !createdUrl ? 'Relatório atualizado' : 'Link pronto para compartilhar'}</h3><p className="mt-1 text-xs text-muted-foreground">Este link não expira e continuará a mostrar as alterações futuras deste relatório.</p>{createdUrl && <div className="mt-3 flex gap-2 rounded-md border border-border bg-card p-2"><input readOnly aria-label="Link criado" value={createdUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" /><Button size="icon" variant="ghost" aria-label="Copiar link" title="Copiar link" onClick={() => { void navigator.clipboard.writeText(createdUrl); }}><Copy /></Button></div>}</div>
        <Button variant="outline" onClick={resetBuilder}>Criar outro relatório</Button>
      </div>}

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="border-t border-border pt-4"><h3 className="mb-3 text-sm font-semibold">Relatórios criados</h3><div className="space-y-2">{links.length === 0 && <p className="text-xs text-muted-foreground">Nenhum relatório criado.</p>}{links.map(link => <div key={link.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{link.title}</p><p className="truncate text-xs text-muted-foreground">{link.revokedAt ? 'Revogado' : `${link.campaigns.length} campanha(s) · atualizado ${new Intl.DateTimeFormat('pt-BR').format(new Date(link.updatedAt))}`}</p></div>{!link.revokedAt && <div className="flex"><Button size="icon" variant="ghost" aria-label="Editar relatório" title="Editar relatório" onClick={() => editReport(link)}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Revogar link" title="Revogar link" onClick={() => { void handleRevoke(link.id); }}><Trash2 /></Button></div>}</div>)}</div></div>
    </DialogContent>
  </Dialog>;
}