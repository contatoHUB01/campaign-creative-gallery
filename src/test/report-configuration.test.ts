import { describe, expect, it } from 'vitest';
import { parseSavedConfiguration, projectSharedReport, reportConfigurationSchema } from '@/lib/report-configuration';
import type { Ad } from '@/lib/ads';

const rows: Ad[] = [
  { id: '1', campaign: 'A', title: 'Um', copy: '', imageUrl: '', format: 'Meta', clicks: 10, spent: 20, status: 'Ativo' },
  { id: '2', campaign: 'A', title: 'Dois', copy: '', imageUrl: '', format: 'Meta', clicks: 30, spent: 40, status: 'Pausado' },
  { id: '3', campaign: 'B', title: 'Três', copy: '', imageUrl: '', format: 'Meta', clicks: 100, spent: 200, status: 'Ativo' },
];
const configuration = reportConfigurationSchema.parse({ campaigns: ['A'], adIds: ['1'], statuses: ['Ativo'], filters: { q: '', sort: 'recent' }, visibility: { clicks: true, spent: false }, overrides: { spent: 999 } });

describe('Saved report projection', () => {
  it('scopes cards and computes selected-campaign totals separately', () => {
    const result = projectSharedReport(rows, configuration);
    expect(result.ads.map(ad => ad.id)).toEqual(['1']);
    expect(result.totals).toEqual({ clicks: 40 });
  });
  it('removes hidden metrics and hidden overrides server-side', () => {
    const result = projectSharedReport(rows, configuration);
    expect(result.ads[0]?.spent).toBe(0);
    expect(result.configuration.overrides).toEqual({});
    expect(JSON.stringify(result)).not.toContain('999');
  });
  it('uses manual totals without changing original rows', () => {
    expect(projectSharedReport(rows, { ...configuration, overrides: { clicks: 7 } }).totals.clicks).toBe(7);
    expect(rows[0]?.clicks).toBe(10);
  });
  it('preserves legacy scope and rejects reversed dates', () => {
    expect(parseSavedConfiguration({ ...configuration, campaigns: [] }, 'Old').campaigns).toEqual(['Old']);
    expect(reportConfigurationSchema.safeParse({ ...configuration, period: { since: '2026-10-15', until: '2026-10-01' } }).success).toBe(false);
  });
});