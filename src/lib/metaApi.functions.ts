import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { readMetaCreatives } from './metaApi.server';
import type { Ad } from './ads';

export type MetaReport = { ads: Ad[]; error: string | null; connected: boolean };

export const buscarCriativosMetaServer = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<MetaReport> => {
    const accessToken = process.env['META_ACCESS_TOKEN'];
    if (!accessToken) return { ads: [], connected: false, error: 'O token privado da Meta ainda não foi configurado.' };
    try {
      return { ads: await readMetaCreatives('815749902379278', accessToken), connected: true, error: null };
    } catch (error) {
      return { ads: [], connected: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os criativos. Tente novamente.' };
    }
  });