import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { CustomIndicator } from '@/lib/report-configuration';

const metricLabels = { clicks: 'Cliques', spent: 'Investimento', conversations: 'Conversas' } as const;
const selectClass = 'h-9 rounded-md border border-input bg-card px-2 text-xs';

export type MetricsState = {
  showClicks: boolean; showSpent: boolean; showConversations: boolean;
  clicksOverride: string; spentOverride: string; indicators: CustomIndicator[];
};
export const defaultMetrics: MetricsState = { showClicks: true, showSpent: true, showConversations: true, clicksOverride: '', spentOverride: '', indicators: [] };

export function ReportMetricsPanel({ value, onChange }: { value: MetricsState; onChange: (next: MetricsState) => void }) {
  const set = (patch: Partial<MetricsState>) => onChange({ ...value, ...patch });
  const setIndicators = (fn: (list: CustomIndicator[]) => CustomIndicator[]) => set({ indicators: fn(value.indicators) });
  return <section aria-label="Métricas do relatório" className="mb-6 space-y-5 rounded-xl border border-border bg-card p-5">
    <fieldset><legend className="mb-3 text-xs font-semibold">Métricas visíveis no relatório</legend><div className="flex flex-wrap gap-3">
      {([['showClicks', 'Cliques'], ['showSpent', 'Investimento'], ['showConversations', 'Conversas e custo por conversa']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><Checkbox checked={value[key]} onCheckedChange={v => set({ [key]: Boolean(v) })} />{label}</label>)}
    </div></fieldset>
    <div><h3 className="text-xs font-semibold">Ajustes manuais dos totais</h3><p className="mt-1 text-xs text-muted-foreground">Em branco usa o valor real da Meta.</p><div className="mt-3 flex flex-wrap gap-4">
      <label className="text-xs">Total de cliques<Input type="number" min="0" value={value.clicksOverride} onChange={e => set({ clicksOverride: e.target.value })} placeholder="Valor real" className="mt-1 h-9 w-40" /></label>
      <label className="text-xs">Investimento total<Input type="number" min="0" step="0.01" value={value.spentOverride} onChange={e => set({ spentOverride: e.target.value })} placeholder="Valor real" className="mt-1 h-9 w-40" /></label>
    </div></div>
    <div><div className="flex items-center justify-between"><h3 className="text-xs font-semibold">Indicadores personalizados</h3><Button type="button" size="sm" variant="outline" onClick={() => setIndicators(list => [...list, { id: crypto.randomUUID().slice(0, 8), name: '', format: 'number', kind: 'value', value: 0 }])}><Plus />Adicionar</Button></div>
      <div className="mt-3 space-y-2">{value.indicators.map(item => { const patch = (next: Partial<CustomIndicator>) => setIndicators(list => list.map(i => i.id === item.id ? { ...i, ...next } : i)); return <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
        <Input aria-label="Nome do indicador" placeholder="Nome (ex.: Vendas)" value={item.name} maxLength={60} onChange={e => patch({ name: e.target.value })} className="h-9 w-40 text-xs" />
        <select aria-label="Tipo" className={selectClass} value={item.kind} onChange={e => patch(e.target.value === 'formula' ? { kind: 'formula', left: item.left ?? 'spent', operator: item.operator ?? '/', right: item.right ?? 'conversations' } : { kind: 'value' })}><option value="value">Valor fixo</option><option value="formula">Fórmula</option></select>
        {item.kind === 'value' ? <Input aria-label="Valor" type="number" step="any" value={item.value ?? 0} onChange={e => patch({ value: Number(e.target.value) || 0 })} className="h-9 w-28 text-xs" /> : <>
          <select aria-label="Primeiro valor" className={selectClass} value={item.left} onChange={e => patch({ left: e.target.value as CustomIndicator['left'] })}>{Object.entries(metricLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select aria-label="Operação" className={selectClass} value={item.operator} onChange={e => patch({ operator: e.target.value as CustomIndicator['operator'] })}><option value="/">÷</option><option value="*">×</option><option value="+">+</option><option value="-">−</option></select>
          <select aria-label="Segundo valor" className={selectClass} value={item.right} onChange={e => patch({ right: e.target.value as CustomIndicator['right'] })}>{Object.entries(metricLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </>}
        <select aria-label="Formato" className={selectClass} value={item.format} onChange={e => patch({ format: e.target.value as CustomIndicator['format'] })}><option value="number">Número</option><option value="currency">R$</option><option value="percent">%</option></select>
        <Button type="button" size="icon" variant="ghost" aria-label="Remover indicador" onClick={() => setIndicators(list => list.filter(i => i.id !== item.id))}><Trash2 /></Button>
      </div>; })}</div></div>
  </section>;
}
