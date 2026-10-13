import { queryOptions } from '@tanstack/react-query';
import { buscarCriativosMetaServer, type MetaReport } from './metaApi.functions';
import { supabase } from '@/integrations/supabase/client';

export const ACCOUNT_ID = '815749902379278';
export const signedOutReport: MetaReport = { ads: [], connected: false, requiresLogin: true, error: 'Entre em uma sessão autorizada do projeto para consultar os criativos reais.' };

export async function buscarCriativosMeta(accountId: string): Promise<MetaReport> {
  // The public SSR screen must never call an authenticated function without a session.
  if (typeof window === 'undefined') return signedOutReport;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return signedOutReport;
  return buscarCriativosMetaServer({ data: { accountId } });
}

export const metaAdsQueryOptions = queryOptions({
  queryKey: ['metaAds', ACCOUNT_ID],
  queryFn: () => buscarCriativosMeta(ACCOUNT_ID),
  staleTime: 15 * 60 * 1000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  retry: false,
});