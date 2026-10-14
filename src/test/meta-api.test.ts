import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMetaCreatives } from '@/lib/metaApi.server';

afterEach(() => vi.restoreAllMocks());

describe('Meta creative reads', () => {
  it('maps real creative fields to the existing card shape and follows cursors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '42', name: 'Criativo real', status: 'ACTIVE', campaign: { name: 'Campanha real' }, creative: { body: 'Texto', image_url: 'https://example.com/image.jpg' }, insights: { data: [{ clicks: '123', spend: '45.67' }] } }], paging: { next: 'next', cursors: { after: 'cursor' } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '43' }] })));
    const rows = await readMetaCreatives('123', 'test-token');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: '42', campaign: 'Campanha real', title: 'Criativo real', copy: 'Texto', imageUrl: 'https://example.com/image.jpg', clicks: 123, spent: 45.67, status: 'Ativo' });
    expect(rows[1]?.title).toBe('Anúncio sem título');
    expect(rows[1]).toMatchObject({ clicks: 0, spent: 0, status: 'Pausado' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('graph.facebook.com/v19.0/act_123/ads?');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('access_token=test-token');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('after=cursor');
  });

  it('converts invalid and missing insights safely', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [{ id: '1', status: 'PAUSED', insights: { data: [{ clicks: 'invalid', spend: 'Infinity' }, { clicks: '-1', spend: null }] } }] })));
    expect((await readMetaCreatives('123', 'test-token'))[0]).toMatchObject({ clicks: 0, spent: 0, status: 'Pausado' });
  });

  it('returns an empty list when Meta has no creatives', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    expect(await readMetaCreatives('123', 'test-token')).toEqual([]);
  });

  it('surfaces access errors without returning failed data as an empty report', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Permission denied' } }), { status: 403 }));
    await expect(readMetaCreatives('123', 'test-token')).rejects.toThrow('Verifique a validade do token');
  });
});