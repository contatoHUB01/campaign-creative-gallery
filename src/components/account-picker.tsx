import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { metaAccountsQueryOptions } from '@/lib/metaApi';

type Props = { onPick: (id: string) => void; current?: string | undefined };

/** Lets the signed-in user choose which Meta ad account feeds the report builder. */
export function AccountPicker({ onPick, current }: Props) {
  const { data, isLoading } = useQuery(metaAccountsQueryOptions());
  const [q, setQ] = useState('');
  const accounts = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('pt-BR');
    return (data?.accounts ?? []).filter(a => !term || a.name.toLocaleLowerCase('pt-BR').includes(term) || a.id.includes(term));
  }, [data, q]);

  return (
    <div className="w-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conta por nome ou número" className="bg-card pl-9" aria-label="Buscar conta de anúncios" />
      </div>
      {isLoading && <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 className="animate-spin" size={16} />Carregando contas...</div>}
      {data?.error && <p className="py-6 text-center text-sm text-destructive" role="alert">{data.error}</p>}
      {!isLoading && !data?.error && accounts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {accounts.map(a => (
          <li key={a.id}>
            <button type="button" onClick={() => onPick(a.id)} className={`flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary hover:shadow-sm ${current === a.id ? 'border-primary' : 'border-border'}`}>
              <Building2 size={18} className="shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{a.id}</span>
              </span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${a.active ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'}`}>{a.active ? 'Ativa' : 'Inativa'}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
