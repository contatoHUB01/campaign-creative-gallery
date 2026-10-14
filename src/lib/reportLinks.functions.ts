import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives } from './metaApi.server';
import type { MetaReport } from './metaApi.functions';

const accountIdSchema = z.literal('815749902379278');
const campaignSchema = z.string().trim().min(1).max(300);

export type CampaignReportLink = {
  id: string;
  campaignName: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

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
  .handler(async (): Promise<CampaignReportLink[]> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin
      .from('campaign_report_links')
      .select('id,campaign_name,expires_at,revoked_at,created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Não foi possível carregar os links compartilhados.');
    return data.map(link => ({
      id: link.id,
      campaignName: link.campaign_name,
      expiresAt: link.expires_at,
      revokedAt: link.revoked_at,
      createdAt: link.created_at,
    }));
  });

export const createCampaignReportLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string; campaignName: string; validDays: number }) => z.object({
    accountId: accountIdSchema,
    campaignName: campaignSchema,
    validDays: z.number().int().min(1).max(30),
  }).parse(input))
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) throw new Error('O token privado da Meta ainda não foi configurado.');
    const ads = await readMetaCreatives(data.accountId, accessToken);
    if (!ads.some(ad => ad.campaign === data.campaignName)) throw new Error('A campanha selecionada não está disponível.');

    const token = makeToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + data.validDays * 24 * 60 * 60 * 1000).toISOString();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: created, error } = await supabaseAdmin
      .from('campaign_report_links')
      .insert({ campaign_name: data.campaignName, token_hash: tokenHash, expires_at: expiresAt, created_by: context.userId })
      .select('id')
      .single();
    if (error) throw new Error('Não foi possível criar o link compartilhável.');
    return { id: created.id, token, expiresAt };
  });

export const revokeCampaignReportLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('campaign_report_links').update({ revoked_at: new Date().toISOString() }).eq('id', data.id);
    if (error) throw new Error('Não foi possível revogar o link.');
    return { ok: true };
  });

export const getSharedCampaignReport = createServerFn({ method: 'POST' })
  .inputValidator((input: { token: string }) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input))
  .handler(async ({ data }): Promise<MetaReport & { campaignName?: string }> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const tokenHash = await hashToken(data.token);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: link, error } = await supabaseAdmin
      .from('campaign_report_links')
      .select('campaign_name,expires_at,revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error || !link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) {
      return { ads: [], connected: false, error: 'Este link não existe, expirou ou foi revogado.' };
    }
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O relatório está temporariamente indisponível.' };
    try {
      const ads = await readMetaCreatives('815749902379278', accessToken);
      return { ads: ads.filter(ad => ad.campaign === link.campaign_name), connected: true, error: null, campaignName: link.campaign_name };
    } catch {
      return { ads: [], connected: false, error: 'Não foi possível carregar este relatório agora.' };
    }
  });