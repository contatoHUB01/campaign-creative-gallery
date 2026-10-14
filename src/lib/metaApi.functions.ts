import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives } from './metaApi.server';
import type { Ad } from './ads';
import { z } from 'zod';
import { setResponseHeader } from '@tanstack/react-start/server';

export type MetaReport = { ads: Ad[]; error: string | null; connected: boolean; requiresLogin?: boolean };

export const buscarCriativosMetaServer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string }) => z.object({ accountId: z.literal('815749902379278') }).parse(input))
  .handler(async ({ data }): Promise<MetaReport> => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O token privado da Meta ainda não foi configurado.' };
    try {
      return { ads: await readMetaCreatives(data.accountId, accessToken), connected: true, error: null };
    } catch (error) {
      console.error('Erro ao consultar o servidor seguro da Meta:', error);
      throw error;
    }
  });