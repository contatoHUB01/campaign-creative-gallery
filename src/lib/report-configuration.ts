import { z } from 'zod';
import type { Ad } from './ads';

export const reportConfigurationSchema = z.object({
  campaigns: z.array(z.string().trim().min(1).max(300)).min(1).max(1000),
  adIds: z.array(z.string()).max(1000).default([]),
  statuses: z.array(z.enum(['Ativo', 'Pausado'])).min(1),
  period: z.object({ since: z.string().date(), until: z.string().date() }).refine(period => period.since <= period.until, 'A data final deve ser posterior à inicial.').optional(),
  filters: z.object({ q: z.string().max(200).default(''), sort: z.enum(['recent', 'clicks', 'spent']).default('recent') }),
  visibility: z.object({ clicks: z.boolean(), spent: z.boolean() }),
  overrides: z.object({ clicks: z.number().finite().int().nonnegative().optional(), spent: z.number().finite().nonnegative().optional() }),
});

export type ReportConfiguration = z.infer<typeof reportConfigurationSchema>;

export function parseSavedConfiguration(value: unknown, legacyCampaign: string): ReportConfiguration {
  const parsed = reportConfigurationSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  // Old single-campaign links retain their original scope.
  if (value && typeof value === 'object' && 'campaigns' in value && Array.isArray(value.campaigns) && value.campaigns.length === 0) {
    return reportConfigurationSchema.parse({ ...value, campaigns: [legacyCampaign] });
  }
  throw new Error('Configuração do relatório inválida.');
}

export function selectReportAds(ads: Ad[], configuration: ReportConfiguration): Ad[] {
  const query = configuration.filters.q.toLocaleLowerCase('pt-BR');
  return ads.filter(ad => configuration.campaigns.includes(ad.campaign)
    && configuration.statuses.includes(ad.status)
    && (!configuration.adIds.length || configuration.adIds.includes(String(ad.id)))
    && `${ad.title} ${ad.copy} ${ad.campaign}`.toLocaleLowerCase('pt-BR').includes(query))
    .sort((a, b) => configuration.filters.sort === 'clicks' ? b.clicks - a.clicks : configuration.filters.sort === 'spent' ? b.spent - a.spent : 0);
}

export function projectSharedReport(ads: Ad[], configuration: ReportConfiguration) {
  const campaignAds = ads.filter(ad => configuration.campaigns.includes(ad.campaign));
  const totals = {
    ...(configuration.visibility.clicks ? { clicks: configuration.overrides.clicks ?? campaignAds.reduce((sum, ad) => sum + ad.clicks, 0) } : {}),
    ...(configuration.visibility.spent ? { spent: configuration.overrides.spent ?? campaignAds.reduce((sum, ad) => sum + ad.spent, 0) } : {}),
  };
  return {
    ads: selectReportAds(ads, configuration).map(ad => ({ ...ad, clicks: configuration.visibility.clicks ? ad.clicks : 0, spent: configuration.visibility.spent ? ad.spent : 0 })),
    totals,
    configuration: { ...configuration, overrides: {
      ...(configuration.visibility.clicks && configuration.overrides.clicks !== undefined ? { clicks: configuration.overrides.clicks } : {}),
      ...(configuration.visibility.spent && configuration.overrides.spent !== undefined ? { spent: configuration.overrides.spent } : {}),
    } },
  };
}