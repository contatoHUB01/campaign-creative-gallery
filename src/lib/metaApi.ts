import { queryOptions } from '@tanstack/react-query';
import { buscarCriativosMetaServer, listarContasMetaServer, type MetaReport } from './metaApi.functions';
import { supabase } from '@/integrations/supabase/client';

export const signedOutReport: MetaReport = { ads: [], connected: false, requiresLogin: true, error: 'Entre em uma sessão autorizada do projeto para consultar os criativos reais.' };

export type Period = { since: string; until: string };

export async function buscarCriativosMeta(accountId: string, period?: Period, options: { activeOnly?: boolean; fresh?: boolean } = {}): Promise<MetaReport> {
  // The public SSR screen must never call an authenticated function without a session.
  if (typeof window === 'undefined') return signedOutReport;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return signedOutReport;
  try {
    return await buscarCriativosMetaServer({ data: { accountId, ...(period ? { period } : {}), activeOnly: Boolean(options.activeOnly), fresh: Boolean(options.fresh) } });
  } catch (error) {
    console.error('Erro no Servidor Seguro:', error);
    throw error;
  }
}

export const metaAccountsQueryOptions = () => queryOptions({
  queryKey: ['metaAds', 'accounts'],
  queryFn: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { accounts: [], error: null };
    return listarContasMetaServer({ data: {} });
  },
  staleTime: 10 * 60 * 1000,
  retry: false,
});

export const metaAdsQueryOptions = (accountId: string, period?: Period, activeOnly = false) => queryOptions({
  queryKey: ['metaAds', accountId, period?.since ?? '', period?.until ?? '', activeOnly ? 'active' : 'all'],
  queryFn: () => buscarCriativosMeta(accountId, period, { activeOnly }),
  staleTime: 15 * 60 * 1000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  retry: false,
});
