import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMetaCreatives } from '@/lib/metaApi.server';

afterEach(() => vi.restoreAllMocks());

describe('Meta creative reads', () => {
  it('maps real creative fields to the existing card shape and follows cursors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '42', name: 'Criativo real', body: 'Texto', image_url: 'https://example.com/image.jpg' }], paging: { next: 'next', cursors: { after: 'cursor' } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: '43' }] })));
    const rows = await readMetaCreatives('123', 'test-token');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: '42', title: 'Criativo real', copy: 'Texto', imageUrl: 'https://example.com/image.jpg', clicks: 0, spent: 0 });
    expect(rows[1]?.title).toBe('Anúncio sem título');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('after=cursor');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('test-token');
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