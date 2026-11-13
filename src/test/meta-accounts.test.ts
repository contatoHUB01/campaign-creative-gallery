import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertAccountAllowed } from '@/lib/metaApi.server';

afterEach(() => vi.unstubAllGlobals());

describe('ad account allowlist', () => {
  it('only allows accounts the Meta token can read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ account_id: '815749902379278', name: 'IE- BELEM', account_status: 1 }] }))));
    await expect(assertAccountAllowed('t', '815749902379278')).resolves.toBeUndefined();
    await expect(assertAccountAllowed('t', '999999999')).rejects.toThrow('não está disponível');
  });
});
