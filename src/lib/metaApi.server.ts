import { z } from 'zod';
import type { Ad } from './ads';

const creativePage = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string().optional(), body: z.string().optional(), image_url: z.string().optional() })),
  paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() }).optional(),
});

export async function readMetaCreatives(accountId: string, accessToken: string): Promise<Ad[]> {
  const rows: Ad[] = [];
  let after: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`https://graph.facebook.com/v26.0/act_${accountId}/adcreatives`);
    url.searchParams.set('fields', 'id,name,image_url,body');
    url.searchParams.set('limit', '100');
    if (after) url.searchParams.set('after', after);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(30000) });
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
    const parsed = creativePage.parse(raw);
    rows.push(...parsed.data.map(item => ({
      id: item.id, campaign: 'Campanha Importada', title: item.name || 'Anúncio sem título',
      copy: item.body || 'Sem texto descritivo.', imageUrl: item.image_url || '',
      format: 'Meta Ads', clicks: 0, spent: 0, status: 'Ativo' as const,
    })));
    if (!parsed.paging?.next) return rows;
    after = parsed.paging.cursors?.after;
    if (!after) throw new Error('A Meta não retornou o cursor para continuar a consulta.');
  }
  throw new Error('A conta possui mais de 1.000 criativos. A consulta precisa ser dividida antes de exibir o relatório completo.');
}