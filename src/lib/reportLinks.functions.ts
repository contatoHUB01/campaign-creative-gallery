import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives } from './metaApi.server';
import type { Ad } from './ads';
import type { MetaReport } from './metaApi.functions';
import type { Json } from '@/integrations/supabase/types';

const accountIdSchema = z.literal('815749902379278');
const reportConfigurationSchema = z.object({
  campaigns: z.array(z.string().trim().min(1).max(300)).min(1),
  adIds: z.array(z.string()).default([]),
  statuses: z.array(z.enum(['Ativo', 'Pausado'])).min(1),
  period: z.object({ since: z.string().date(), until: z.string().date() }).optional(),
  filters: z.object({ q: z.string().max(200).default(''), sort: z.enum(['recent', 'clicks', 'spent']).default('recent') }),
  visibility: z.object({ clicks: z.boolean(), spent: z.boolean() }),
  overrides: z.object({ clicks: z.number().nonnegative().optional(), spent: z.number().nonnegative().optional() }),
});

export type ReportConfiguration = z.infer<typeof reportConfigurationSchema>;
export type CampaignReportLink = {
  id: string;
  title: string;
  campaigns: string[];
  configuration: ReportConfiguration;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SharedMetaReport = MetaReport & { title?: string; campaignName?: string; configuration?: ReportConfiguration };

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function makeToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function parseConfiguration(value: Json): ReportConfiguration {
  return reportConfigurationSchema.parse(value);
}

function filterAds(ads: Ad[], configuration: ReportConfiguration): Ad[] {
  const query = configuration.filters.q.toLocaleLowerCase('pt-BR');
  const selected = ads.filter(ad =>
    configuration.campaigns.includes(ad.campaign)
    && configuration.statuses.includes(ad.status)
    && (configuration.adIds.length === 0 || configuration.adIds.includes(String(ad.id)))
    && `${ad.title} ${ad.copy} ${ad.campaign}`.toLocaleLowerCase('pt-BR').includes(query)
  );
  return selected.sort((a, b) => configuration.filters.sort === 'clicks' ? b.clicks - a.clicks : configuration.filters.sort === 'spent' ? b.spent - a.spent : 0);
}

export const listCampaignReportLinks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CampaignReportLink[]> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('campaign_report_links')
      .select('id,title,configuration,revoked_at,created_at,updated_at')
      .eq('created_by', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error('Não foi possível carregar os relatórios.');
    return data.map(link => {
      const configuration = parseConfiguration(link.configuration);
      return { id: link.id, title: link.title, campaigns: configuration.campaigns, configuration, revokedAt: link.revoked_at, createdAt: link.created_at, updatedAt: link.updated_at };
    });
  });

export const createCampaignReportLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string; title: string; configuration: ReportConfiguration }) => z.object({
    accountId: accountIdSchema,
    title: z.string().trim().min(1).max(120),
    configuration: reportConfigurationSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const token = makeToken();
    const tokenHash = await hashToken(token);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await supabaseAdmin.from('campaign_report_links').insert({
      title: data.title,
      campaign_name: data.configuration.campaigns[0] ?? 'Relatório',
      configuration: data.configuration,
      token_hash: tokenHash,
      expires_at: null,
      created_by: context.userId,
    }).select('id').single();
    if (error) throw new Error('Não foi possível criar o relatório compartilhável.');
    return { id: created.id, token };
  });

export const updateCampaignReportLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; title: string; configuration: ReportConfiguration }) => z.object({
    id: z.string().uuid(), title: z.string().trim().min(1).max(120), configuration: reportConfigurationSchema,
  }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: updated, error } = await supabaseAdmin.from('campaign_report_links').update({
      title: data.title, campaign_name: data.configuration.campaigns[0] ?? 'Relatório', configuration: data.configuration,
    }).eq('id', data.id).eq('created_by', context.userId).is('revoked_at', null).select('id').maybeSingle();
    if (error || !updated) throw new Error('Não foi possível atualizar este relatório.');
    return { ok: true };
  });

export const revokeCampaignReportLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: revoked, error } = await supabaseAdmin.from('campaign_report_links').update({ revoked_at: new Date().toISOString() }).eq('id', data.id).eq('created_by', context.userId).select('id').maybeSingle();
    if (error || !revoked) throw new Error('Não foi possível revogar o link.');
    return { ok: true };
  });

export const getSharedCampaignReport = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string }) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input))
  .handler(async ({ data }): Promise<SharedMetaReport> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const tokenHash = await hashToken(data.token);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: link, error } = await supabaseAdmin.from('campaign_report_links').select('title,configuration,revoked_at').eq('token_hash', tokenHash).maybeSingle();
    if (error || !link || link.revoked_at) return { ads: [], connected: false, error: 'Este link não existe ou foi revogado.' };
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O relatório está temporariamente indisponível.' };
    try {
      const configuration = parseConfiguration(link.configuration);
      const ads = filterAds(await readMetaCreatives('815749902379278', accessToken, configuration.period), configuration);
      return { ads, connected: true, error: null, title: link.title, campaignName: configuration.campaigns.join(', '), configuration };
    } catch (cause) {
      console.error('Erro ao carregar relatório compartilhado:', cause);
      return { ads: [], connected: false, error: 'Não foi possível carregar este relatório agora.' };
    }
  });