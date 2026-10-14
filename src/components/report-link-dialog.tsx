import { useEffect, useState } from 'react';
import { Copy, Link2, Loader2, Share2, Trash2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCOUNT_ID } from '@/lib/metaApi';
import { createCampaignReportLink, listCampaignReportLinks, revokeCampaignReportLink, type CampaignReportLink } from '@/lib/reportLinks.functions';

export function ReportLinkDialog({ campaigns }: { campaigns: string[] }) {
  const listLinks = useServerFn(listCampaignReportLinks);
  const createLink = useServerFn(createCampaignReportLink);
  const revokeLink = useServerFn(revokeCampaignReportLink);
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState(campaigns[0] ?? '');
  const [days, setDays] = useState('7');
  const [links, setLinks] = useState<CampaignReportLink[]>([]);
  const [createdUrl, setCreatedUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    void listLinks().then(setLinks).catch(() => setError('Não foi possível carregar os links.'));
  }, [listLinks, open]);

  async function handleCreate() {
    if (!campaign || pending) return;
    setPending(true);
    setError('');
    try {
      const result = await createLink({ data: { accountId: ACCOUNT_ID, campaignName: campaign, validDays: Number(days) } });
      setCreatedUrl(`${window.location.origin}/report/${result.token}`);
      setLinks(await listLinks());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o link.');
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke(id: string) {
    await revokeLink({ data: { id } });
    setLinks(current => current.map(link => link.id === id ? { ...link, revokedAt: new Date().toISOString() } : link));
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="bg-card"><Share2 />Compartilhar</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Compartilhar relatório</DialogTitle><DialogDescription>Crie um acesso temporário para uma única campanha.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-[1fr_130px_auto]">
        <Select value={campaign} onValueChange={setCampaign}><SelectTrigger aria-label="Campanha do link"><SelectValue placeholder="Campanha" /></SelectTrigger><SelectContent>{campaigns.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select>
        <Select value={days} onValueChange={setDays}><SelectTrigger aria-label="Validade do link"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 dia</SelectItem><SelectItem value="7">7 dias</SelectItem><SelectItem value="15">15 dias</SelectItem><SelectItem value="30">30 dias</SelectItem></SelectContent></Select>
        <Button onClick={() => { void handleCreate(); }} disabled={!campaign || pending}>{pending ? <Loader2 className="animate-spin" /> : <Link2 />}Criar</Button>
      </div>
      {createdUrl && <div className="flex gap-2 rounded-md border border-border bg-muted p-2"><input readOnly aria-label="Link criado" value={createdUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" /><Button size="icon" variant="ghost" aria-label="Copiar link" title="Copiar link" onClick={() => { void navigator.clipboard.writeText(createdUrl); }}><Copy /></Button></div>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="border-t border-border pt-4">
        <h3 className="mb-3 text-sm font-semibold">Links recentes</h3>
        <div className="space-y-2">{links.length === 0 && <p className="text-xs text-muted-foreground">Nenhum link criado.</p>}{links.map(link => {
          const inactive = Boolean(link.revokedAt) || new Date(link.expiresAt).getTime() <= Date.now();
          return <div key={link.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{link.campaignName}</p><p className="text-xs text-muted-foreground">{inactive ? 'Inativo' : `Válido até ${new Intl.DateTimeFormat('pt-BR').format(new Date(link.expiresAt))}`}</p></div>{!inactive && <Button size="icon" variant="ghost" aria-label="Revogar link" title="Revogar link" onClick={() => { void handleRevoke(link.id); }}><Trash2 /></Button>}</div>;
        })}</div>
      </div>
    </DialogContent>
  </Dialog>;
}