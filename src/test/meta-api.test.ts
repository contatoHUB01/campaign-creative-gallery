import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMetaCreatives } from '@/lib/metaApi.server';

afterEach(() => vi.restoreAllMocks());

type Routes = { ads: unknown[]; insights: unknown[] };
function mockMeta(routes: Routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    const list = url.includes('/insights') ? routes.insights : routes.ads;
    return new Response(JSON.stringify(list.shift() ?? { data: [] }));
  });
}

describe('Meta creative reads', () => {
  it('merges creatives with the account-level metrics report and follows cursors', async () => {
    const fetchMock = mockMeta({
      ads: [{ data: [{ id: '42', name: 'Criativo real', status: 'ACTIVE', campaign: { name: 'Campanha real' }, creative: { body: 'Texto', image_url: 'https://example.com/image.jpg' } }], paging: { next: 'next', cursors: { after: 'cursor' } } }, { data: [{ id: '43' }] }],
      insights: [{ data: [{ ad_id: '42', clicks: '123', spend: '45.67', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '5' }] }] }],
    });
    const rows = await readMetaCreatives('123', 'test-token');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: '42', campaign: 'Campanha real', title: 'Criativo real', copy: 'Texto', imageUrl: 'https://example.com/image.jpg', clicks: 123, spent: 45.67, conversations: 5, status: 'Ativo' });
    expect(rows[1]).toMatchObject({ title: 'Anúncio sem título', clicks: 0, spent: 0, status: 'Pausado' });
    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('v19.0/act_123/ads?') && u.includes('access_token=test-token'))).toBe(true);
    expect(urls.some(u => u.includes('v19.0/act_123/insights?') && u.includes('level=ad'))).toBe(true);
    expect(urls.some(u => u.includes('after=cursor'))).toBe(true);
  });

  it('converts invalid metrics safely', async () => {
    mockMeta({ ads: [{ data: [{ id: '1', status: 'PAUSED' }] }], insights: [{ data: [{ ad_id: '1', clicks: 'invalid', spend: 'Infinity' }, { ad_id: '1', clicks: '-1', spend: null }] }] });
    expect((await readMetaCreatives('123', 'test-token'))[0]).toMatchObject({ clicks: 0, spent: 0, status: 'Pausado' });
  });

  it('returns an empty list when Meta has no creatives', async () => {
    mockMeta({ ads: [], insights: [] });
    expect(await readMetaCreatives('123', 'test-token')).toEqual([]);
  });

  it('surfaces access errors without returning failed data as an empty report', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ error: { message: 'Permission denied' } }), { status: 403 }));
    await expect(readMetaCreatives('123', 'test-token')).rejects.toThrow('Verifique a validade do token');
  });
});
