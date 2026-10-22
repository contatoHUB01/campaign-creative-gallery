import { z } from 'zod';
import type { Ad } from './ads';

const creativePage = z.object({
  data: z.array(z.object({
    id: z.string(), name: z.string().nullish(), status: z.string().nullish(),
    campaign: z.object({ name: z.string().nullish() }).nullish(),
    creative: z.object({ name: z.string().nullish(), body: z.string().nullish(), image_url: z.string().nullish(), thumbnail_url: z.string().nullish() }).nullish(),
    insights: z.object({ data: z.array(z.object({ clicks: z.union([z.string(), z.number()]).nullish(), spend: z.union([z.string(), z.number()]).nullish(), actions: z.array(z.object({ action_type: z.string(), value: z.union([z.string(), z.number()]).nullish() })).nullish() })) }).nullish(),
  })),
  paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
});

const CONVERSATION_ACTION = 'onsite_conversion.messaging_conversation_started_7d';

function safeNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

const CACHE_TTL = 5 * 60 * 1000;
// Closed periods no longer change, so they can stay cached much longer.
const CLOSED_PERIOD_TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; rows: Promise<Ad[]> }>();

export async function readMetaCreatives(accountId: string, accessToken: string, period?: { since: string; until: string }, options: { activeOnly?: boolean; fresh?: boolean } = {}): Promise<Ad[]> {
  const activeOnly = Boolean(options.activeOnly);
  if (process.env['VITEST']) return fetchMetaCreatives(accountId, accessToken, period, activeOnly);
  const key = `${accountId}|${period?.since ?? ''}|${period?.until ?? ''}|${activeOnly}`;
  const hit = cache.get(key);
  const ttl = period && period.until < new Date().toISOString().slice(0, 10) ? CLOSED_PERIOD_TTL : CACHE_TTL;
  if (!options.fresh && hit && Date.now() - hit.at < ttl) return hit.rows;
  const rows = fetchMetaCreatives(accountId, accessToken, period, activeOnly);
  cache.set(key, { at: Date.now(), rows });
  rows.catch(() => cache.delete(key));
  return rows;
}

const insightsPage = z.object({
  data: z.array(z.object({ ad_id: z.string(), clicks: z.union([z.string(), z.number()]).nullish(), spend: z.union([z.string(), z.number()]).nullish(), actions: z.array(z.object({ action_type: z.string(), value: z.union([z.string(), z.number()]).nullish() })).nullish() })),
  paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
});
type Metrics = { clicks: number; spent: number; conversations: number };

async function getJson(url: URL, accessToken: string): Promise<unknown> {
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
  return raw;
}

function sumMetrics(list: Array<{ clicks?: string | number | null; spend?: string | number | null; actions?: Array<{ action_type: string; value?: string | number | null }> | null }>): Metrics {
  return {
    clicks: list.reduce((t, i) => t + safeNumber(i.clicks), 0),
    spent: list.reduce((t, i) => t + safeNumber(i.spend), 0),
    conversations: list.reduce((t, i) => t + (i.actions ?? []).filter(a => a.action_type === CONVERSATION_ACTION).reduce((s, a) => s + safeNumber(a.value), 0), 0),
  };
}

/** Reads all ad metrics in one account-level report (much faster than per-ad insights). */
async function fetchAdMetrics(accountId: string, accessToken: string, period: { since: string; until: string } | undefined, activeOnly: boolean): Promise<Map<string, Metrics> | null> {
  const metrics = new Map<string, Metrics>();
  let after: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/insights`);
    url.searchParams.set('level', 'ad');
    url.searchParams.set('fields', 'ad_id,clicks,spend,actions');
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('limit', '500');
    if (period) url.searchParams.set('time_range', JSON.stringify(period)); else url.searchParams.set('date_preset', 'maximum');
    if (activeOnly) url.searchParams.set('filtering', JSON.stringify([{ field: 'ad.effective_status', operator: 'IN', value: ['ACTIVE'] }]));
    if (after) url.searchParams.set('after', after);
    const parsed = insightsPage.safeParse(await getJson(url, accessToken));
    if (!parsed.success) return null;
    for (const row of parsed.data.data) {
      const prev = metrics.get(row.ad_id) ?? { clicks: 0, spent: 0, conversations: 0 };
      const next = sumMetrics([row]);
      metrics.set(row.ad_id, { clicks: prev.clicks + next.clicks, spent: prev.spent + next.spent, conversations: prev.conversations + next.conversations });
    }
    after = parsed.data.paging?.next ? parsed.data.paging.cursors?.after : undefined;
    if (!after) return metrics;
  }
  return metrics;
}

async function fetchMetaCreatives(accountId: string, accessToken: string, period: { since: string; until: string } | undefined, activeOnly: boolean): Promise<Ad[]> {
  // Metrics and creatives are requested at the same time; if the metrics report fails, per-ad insights are used.
  const metricsPromise = fetchAdMetrics(accountId, accessToken, period, activeOnly).catch(() => null);
  const rows: Array<Ad & { nested: Metrics }> = [];
  let after: string | undefined;
  let done = false;
  for (let page = 0; page < 10 && !done; page += 1) {
    const url = new URL(`https://graph.facebook.com/v19.0/act_${accountId}/ads`);
    const insightsField = period ? `insights.time_range(${JSON.stringify(period)}){clicks,spend,actions}` : 'insights{clicks,spend,actions}';
    url.searchParams.set('fields', `id,name,status,campaign{name},creative.thumbnail_width(600).thumbnail_height(600){name,image_url,thumbnail_url,body},${insightsField}`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('limit', '100');
    if (activeOnly) url.searchParams.set('effective_status', JSON.stringify(['ACTIVE']));
    if (after) url.searchParams.set('after', after);
    const parsed = creativePage.parse(await getJson(url, accessToken));
    rows.push(...parsed.data.map(item => {
      const nested = sumMetrics(item.insights?.data ?? []);
      return {
        id: item.id, campaign: item.campaign?.name || 'Sem campanha', title: item.name || item.creative?.name || 'Anúncio sem título',
        copy: item.creative?.body || 'Sem texto descritivo.', imageUrl: item.creative?.image_url || item.creative?.thumbnail_url || '',
        format: 'Meta Ads', ...nested, nested,
        status: item.status === 'ACTIVE' ? 'Ativo' as const : 'Pausado' as const,
      };
    }));
    if (!parsed.paging?.next) { done = true; break; }
    after = parsed.paging.cursors?.after;
    if (!after) throw new Error('A Meta não retornou o cursor para continuar a consulta.');
  }
  if (!done) throw new Error('A conta possui mais de 1.000 criativos. A consulta precisa ser dividida antes de exibir o relatório completo.');
  const metrics = await metricsPromise;
  return rows.map(({ nested, ...ad }) => {
    const m = metrics?.size ? metrics.get(String(ad.id)) ?? { clicks: 0, spent: 0, conversations: 0 } : nested;
    return { ...ad, ...m };
  });
}
