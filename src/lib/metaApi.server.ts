import { z } from 'zod';
import type { Ad } from './ads';

const creativePage = z.object({
  data: z.array(z.object({
    id: z.string(), name: z.string().nullish(), status: z.string().nullish(),
    campaign: z.object({ name: z.string().nullish() }).nullish(),
    creative: z.object({ name: z.string().nullish(), body: z.string().nullish(), image_url: z.string().nullish() }).nullish(),
    insights: z.object({ data: z.array(z.object({ clicks: z.union([z.string(), z.number()]).nullish(), spend: z.union([z.string(), z.number()]).nullish(), actions: z.array(z.object({ action_type: z.string(), value: z.union([z.string(), z.number()]).nullish() })).nullish() })) }).nullish(),
  })),
  paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
});

const CONVERSATION_ACTION = 'onsite_conversion.messaging_conversation_started_7d';

function safeNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function readMetaCreatives(accountId: string, accessToken: string, period?: { since: string; until: string }): Promise<Ad[]> {
  const rows: Ad[] = [];
  let after: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/ads`);
    const insightsField = period
      ? `insights.time_range(${JSON.stringify(period)}){clicks,spend,actions}`
      : 'insights{clicks,spend,actions}';
    url.searchParams.set('fields', `id,name,status,campaign{name},creative{name,image_url,body},${insightsField}`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      const body = (await response.text()).replaceAll(accessToken, '[redacted]');
      console.error(`Meta Ads [${response.status}]: ${body}`);
      throw new Error('Não foi possível consultar a Meta. Verifique a validade do token e o acesso à conta de anúncios.');
    }
    const raw: unknown = await response.json();
    if (raw && typeof raw === 'object' && 'error' in raw) {
      console.error('Meta Ads retornou um erro na consulta.');
      throw new Error('A Meta recusou a consulta. Verifique o token e as permissões da conta.');
    }
    const parsed = creativePage.parse(raw);
    rows.push(...parsed.data.map(item => ({
      id: item.id, campaign: item.campaign?.name || 'Sem campanha', title: item.name || item.creative?.name || 'Anúncio sem título',
      copy: item.creative?.body || 'Sem texto descritivo.', imageUrl: item.creative?.image_url || '',
      format: 'Meta Ads',
      clicks: (item.insights?.data ?? []).reduce((total, insight) => total + safeNumber(insight.clicks), 0),
      spent: (item.insights?.data ?? []).reduce((total, insight) => total + safeNumber(insight.spend), 0),
      conversations: (item.insights?.data ?? []).reduce((total, insight) => total + (insight.actions ?? []).filter(action => action.action_type === CONVERSATION_ACTION).reduce((sum, action) => sum + safeNumber(action.value), 0), 0),
      status: item.status === 'ACTIVE' ? 'Ativo' as const : 'Pausado' as const,
    })));
    if (!parsed.paging?.next) return rows;
    after = parsed.paging.cursors?.after;
    if (!after) throw new Error('A Meta não retornou o cursor para continuar a consulta.');
  }
  throw new Error('A conta possui mais de 1.000 criativos. A consulta precisa ser dividida antes de exibir o relatório completo.');
}