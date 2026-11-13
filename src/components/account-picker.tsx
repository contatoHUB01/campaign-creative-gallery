import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conta por nome ou número" className="bg-card pl-9" aria-label="Buscar conta de anúncios" />
      </div>
      {isLoading && <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground" role="status"><Loader2 className="animate-spin" size={16} />Carregando contas...</div>}
      {data?.error && <p className="py-6 text-center text-sm text-destructive" role="alert">{data.error}</p>}
      {!isLoading && !data?.error && accounts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>}
      {accounts.length > 0 && (
        <Select value={current && accounts.some(a => a.id === current) ? current : ''} onValueChange={onPick}>
          <SelectTrigger className="h-12 bg-card" aria-label="Conta de anúncios">
            <SelectValue placeholder={`Escolha uma conta (${accounts.length})`} />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <Building2 size={15} className="shrink-0 text-primary" />
                  <span className="font-medium">{a.name}</span>{a.balanceLabel && <span className="ml-2 text-xs text-muted-foreground">{a.balanceLabel}</span>}
                  <span className="text-xs text-muted-foreground">{a.id}</span>
                  {!a.active && <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">Inativa</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
