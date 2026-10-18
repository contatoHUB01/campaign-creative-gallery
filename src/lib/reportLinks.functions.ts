import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives } from './metaApi.server';
import type { MetaReport } from './metaApi.functions';
import { reportConfigurationSchema, parseSavedConfiguration, projectSharedReport, type ReportConfiguration } from './report-configuration';
export type { ReportConfiguration } from './report-configuration';

const accountIdSchema = z.literal('815749902379278');
export type CampaignReportLink = {
  id: string;
  title: string;
  campaigns: string[];
  configuration: ReportConfiguration;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SharedMetaReport = MetaReport & { title?: string; campaignName?: string; configuration?: ReportConfiguration; totals?: { clicks?: number; spent?: number; conversations?: number; custom?: Array<{ id: string; name: string; format: 'number' | 'currency' | 'percent'; value: number }> } };

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

export const listCampaignReportLinks = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CampaignReportLink[]> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('campaign_report_links')
      .select('id,title,campaign_name,configuration,revoked_at,created_at,updated_at')
      .eq('created_by', context.userId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error('Não foi possível carregar os relatórios.');
    return data.map(link => {
      const configuration = parseSavedConfiguration(link.configuration, link.campaign_name);
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
    const { data: link, error } = await supabaseAdmin.from('campaign_report_links').select('title,campaign_name,configuration,expires_at,revoked_at').eq('token_hash', tokenHash).maybeSingle();
    if (error || !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())) return { ads: [], connected: false, error: 'Este link não existe, expirou ou foi revogado.' };
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O relatório está temporariamente indisponível.' };
    try {
      const configuration = parseSavedConfiguration(link.configuration, link.campaign_name);
      const projection = projectSharedReport(await readMetaCreatives('815749902379278', accessToken, configuration.period), configuration);
      return { ...projection, connected: true, error: null, title: link.title, campaignName: configuration.campaigns.join(', ') };
    } catch (cause) {
      console.error('Erro ao carregar relatório compartilhado:', cause);
      return { ads: [], connected: false, error: 'Não foi possível carregar este relatório agora.' };
    }
  });