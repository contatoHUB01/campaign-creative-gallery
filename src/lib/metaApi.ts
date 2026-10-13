import { queryOptions } from '@tanstack/react-query';
import { buscarCriativosMetaServer, type MetaReport } from './metaApi.functions';

export async function buscarCriativosMeta(): Promise<MetaReport> {
  // The public SSR screen must never call an authenticated function without a session.
  if (typeof window === 'undefined') return { ads: [], connected: false, error: 'Entre em uma sessão autorizada do projeto para consultar os criativos reais.' };
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { ads: [], connected: false, error: 'Entre em uma sessão autorizada do projeto para consultar os criativos reais.' };
  return buscarCriativosMetaServer();
}

export const metaAdsQueryOptions = queryOptions({
  queryKey: ['metaAds', '815749902379278'],
  queryFn: buscarCriativosMeta,
  staleTime: 15 * 60 * 1000,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  retry: false,
});