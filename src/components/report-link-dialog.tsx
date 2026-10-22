import { useEffect, useState } from 'react';
import { Copy, Eye, Link2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ACCOUNT_ID } from '@/lib/metaApi';
import { createCampaignReportLink, issueCampaignReportLink, listCampaignReportLinks, revokeCampaignReportLink, updateCampaignReportLink, type CampaignReportLink, type ReportConfiguration } from '@/lib/reportLinks.functions';

type Props = {
  configuration: ReportConfiguration | null;
  editing: { id: string; title: string } | null;
  onEdit: (link: CampaignReportLink) => void;
  onSaved: (saved: { id: string; title: string }) => void;
};

/** Names the current panel state as a version and shares it through a public link. */
export function ReportLinkDialog({ configuration, editing, onEdit, onSaved }: Props) {
  const listLinks = useServerFn(listCampaignReportLinks);
  const createLink = useServerFn(createCampaignReportLink);
  const updateLink = useServerFn(updateCampaignReportLink);
  const revokeLink = useServerFn(revokeCampaignReportLink);
  const issueLink = useServerFn(issueCampaignReportLink);
  const [copied, setCopied] = useState('');
  const linkFor = (token: string) => `${window.location.origin}/report/${token}`;
  const copy = (value: string) => { void navigator.clipboard.writeText(value); setCopied(value); };
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<CampaignReportLink[]>([]);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? 'Relatório de campanhas'); setUrl(''); setMessage(''); setError('');
    void listLinks().then(setLinks).catch(() => setError('Não foi possível carregar as versões.'));
  }, [open, editing, listLinks]);

  async function save(asNew: boolean) {
    if (!configuration || !title.trim() || pending) return;
    setPending(true); setError(''); setMessage(''); setUrl('');
    try {
      if (editing && !asNew) {
        await updateLink({ data: { id: editing.id, title, configuration } });
        onSaved({ id: editing.id, title });
        setMessage('Versão atualizada. O mesmo link já mostra as alterações.');
        const current = (await listLinks()).find(l => l.id === editing.id);
        if (current?.token) setUrl(linkFor(current.token));
      } else {
        const result = await createLink({ data: { accountId: ACCOUNT_ID, title, configuration } });
        onSaved({ id: result.id, title });
        setUrl(linkFor(result.token));
      }
      setLinks(await listLinks());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a versão.');
    } finally { setPending(false); }
  }

  async function issue(id: string) {
    try { const { token } = await issueLink({ data: { id } }); setLinks(list => list.map(l => l.id === id ? { ...l, token } : l)); copy(linkFor(token)); }
    catch { setError('Não foi possível gerar o link.'); }
  }

  async function revoke(id: string) {
    try { await revokeLink({ data: { id } }); setLinks(list => list.map(l => l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l)); }
    catch { setError('Não foi possível revogar o link.'); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="gap-2"><Eye />Gerar vista</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Gerar vista do relatório</DialogTitle><DialogDescription>Dê um nome a esta versão. O link abre sem login e mostra só os criativos e indicadores definidos no painel.</DialogDescription></DialogHeader>
      {!configuration ? <p className="text-sm text-muted-foreground">Aplique os filtros no painel e aguarde os criativos carregarem antes de gerar a vista.</p> : <div className="space-y-4">
        <div><label htmlFor="version-title" className="mb-2 block text-xs font-medium">Nome da versão</label><Input id="version-title" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></div>
        <div className="flex flex-wrap justify-end gap-2">
          {editing && <Button variant="outline" onClick={() => { void save(false); }} disabled={pending || !title.trim()}>Atualizar “{editing.title}”</Button>}
          <Button onClick={() => { void save(true); }} disabled={pending || !title.trim()}>{pending && <Loader2 className="animate-spin" />}{editing ? 'Salvar como nova versão' : 'Salvar e gerar link'}</Button>
        </div>
        {url && <div className="rounded-md border border-border bg-muted p-3"><p className="mb-2 text-xs font-medium">Link pronto (não expira):</p><div className="flex gap-2 rounded-md border border-border bg-card p-2"><input readOnly aria-label="Link criado" value={url} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" /><Button size="icon" variant="ghost" aria-label="Copiar link" onClick={() => copy(url)}><Copy /></Button></div>{copied === url && <p className="mt-2 text-xs text-primary">Link copiado.</p>}</div>}
        {message && <p className="text-sm text-primary">{message}</p>}
      </div>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="border-t border-border pt-4"><h3 className="mb-3 text-sm font-semibold">Versões salvas</h3><div className="space-y-2">{links.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão salva.</p>}{links.map(link => <div key={link.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{link.title}</p><p className="truncate text-xs text-muted-foreground">{link.revokedAt ? 'Revogado' : `${link.campaigns.length} campanha(s) · atualizado ${new Intl.DateTimeFormat('pt-BR').format(new Date(link.updatedAt))}`}</p>{link.token && <a href={linkFor(link.token)} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary underline">{linkFor(link.token)}</a>}{copied && link.token && copied === linkFor(link.token) && <p className="text-xs text-primary">Link copiado.</p>}</div>{!link.revokedAt && <div className="flex">{link.token ? <Button size="icon" variant="ghost" aria-label="Copiar link" title="Copiar link" onClick={() => copy(linkFor(link.token!))}><Copy /></Button> : <Button size="sm" variant="outline" className="gap-1" title="Versão salva antes de os links ficarem guardados" onClick={() => { void issue(link.id); }}><Link2 />Gerar link</Button>}<Button size="icon" variant="ghost" aria-label="Abrir no painel para editar" title="Abrir no painel para editar" onClick={() => { onEdit(link); setOpen(false); }}><Pencil /></Button><Button size="icon" variant="ghost" aria-label="Revogar link" title="Revogar link" onClick={() => { void revoke(link.id); }}><Trash2 /></Button></div>}</div>)}</div></div>
    </DialogContent>
  </Dialog>;
}
