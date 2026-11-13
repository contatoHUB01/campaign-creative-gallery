import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives, listMetaAdAccounts, assertAccountAllowed, type MetaAdAccount } from './metaApi.server';
import { accountIdSchema } from './report-configuration';
export type { MetaAdAccount } from './metaApi.server';
import type { Ad } from './ads';
import { z } from 'zod';
import { setResponseHeader } from '@tanstack/react-start/server';

export type MetaReport = { ads: Ad[]; error: string | null; connected: boolean; requiresLogin?: boolean };

export const buscarCriativosMetaServer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string; period?: { since: string; until: string }; activeOnly?: boolean; fresh?: boolean }) => z.object({
    accountId: accountIdSchema,
    period: z.object({ since: z.string().date(), until: z.string().date() }).refine(p => p.since <= p.until, 'A data final deve ser posterior à inicial.').optional(),
    activeOnly: z.boolean().optional(),
    fresh: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data }): Promise<MetaReport> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O token privado da Meta ainda não foi configurado.' };
    try {
      await assertAccountAllowed(accessToken, data.accountId);
      return { ads: await readMetaCreatives(data.accountId, accessToken, data.period, { activeOnly: Boolean(data.activeOnly), fresh: Boolean(data.fresh) }), connected: true, error: null };
    } catch (error) {
      console.error('Erro ao consultar o servidor seguro da Meta:', error);
      throw error;
    }
  });
export const listarContasMetaServer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fresh?: boolean } | undefined) => z.object({ fresh: z.boolean().optional() }).parse(input ?? {}))
  .handler(async ({ data }): Promise<{ accounts: MetaAdAccount[]; error: string | null }> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { accounts: [], error: 'O token privado da Meta ainda não foi configurado.' };
    try {
      return { accounts: await listMetaAdAccounts(accessToken, Boolean(data.fresh)), error: null };
    } catch (error) {
      console.error('Erro ao listar contas da Meta:', error);
      return { accounts: [], error: 'Não foi possível carregar as contas de anúncios.' };
    }
  });
