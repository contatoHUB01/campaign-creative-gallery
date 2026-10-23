import { z } from 'zod';
import type { Ad } from './ads';

export const baseMetrics = ['clicks', 'spent', 'conversations'] as const;
export type BaseMetric = typeof baseMetrics[number];

export const customIndicatorSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  format: z.enum(['number', 'currency', 'percent']),
  kind: z.enum(['value', 'formula']),
  value: z.number().finite().optional(),
  left: z.enum(baseMetrics).optional(),
  operator: z.enum(['+', '-', '*', '/']).optional(),
  right: z.enum(baseMetrics).optional(),
});
export type CustomIndicator = z.infer<typeof customIndicatorSchema>;

export const campaignOverrideSchema = z.object({
  clicks: z.number().finite().int().nonnegative().optional(),
  spend: z.number().finite().nonnegative().optional(),
  spent: z.number().finite().nonnegative().optional(), // Aceita spend ou spent
  conversations: z.number().finite().int().nonnegative().optional(),
});
export type CampaignOverride = z.infer<typeof campaignOverrideSchema>;

export function computeIndicator(indicator: CustomIndicator, totals: Record<BaseMetric, number>): number {
  if (indicator.kind === 'value') return indicator.value ?? 0;
  if (!indicator.left || !indicator.right || !indicator.operator) return 0;
  const a = totals[indicator.left], b = totals[indicator.right];
  const result = indicator.operator === '+' ? a + b : indicator.operator === '-' ? a - b : indicator.operator === '*' ? a * b : b ? a / b : 0;
  const scaled = indicator.format === 'percent' ? result * 100 : result;
  return Number.isFinite(scaled) ? scaled : 0;
}

export const reportConfigurationSchema = z.object({
  campaigns: z.array(z.string().trim().min(1).max(300)).min(1).max(1000),
  adIds: z.array(z.string()).max(1000).default([]),
  statuses: z.array(z.enum(['Ativo', 'Pausado'])).min(1),
  period: z.object({ since: z.string().date(), until: z.string().date() }).refine(period => period.since <= period.until, 'A data final deve ser posterior à inicial.').optional(),
  filters: z.object({ q: z.string().max(200).default(''), sort: z.enum(['recent', 'clicks', 'spent']).default('recent') }),
  visibility: z.object({ clicks: z.boolean(), spent: z.boolean(), conversations: z.boolean().default(false) }),
  showCardMetrics: z.boolean().default(true),
  overrides: z.object({ clicks: z.number().finite().int().nonnegative().optional(), spent: z.number().finite().nonnegative().optional() }).default({}),
  campaignOverrides: z.record(z.string(), campaignOverrideSchema).default({}),
  customIndicators: z.array(customIndicatorSchema).max(20).default([]),
});

export type ReportConfiguration = z.infer<typeof reportConfigurationSchema>;

export function parseSavedConfiguration(value: unknown, legacyCampaign: string): ReportConfiguration {
  const parsed = reportConfigurationSchema.safeParse(value);
  if (parsed.success) return parsed.data;
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

export type CampaignGroup = {
  name: string;
  totals: { clicks: number; spent: number; conversations: number };
  ads: Ad[];
};

export function projectSharedReport(ads: Ad[], configuration: ReportConfiguration) {
  const campaignAds = ads.filter(ad => configuration.campaigns.includes(ad.campaign));
  const selectedAds = selectReportAds(ads, configuration);

  // Totais Globais no TOPO: estritamente os dados brutos ou o override global geral
  const realGlobal = {
    clicks: configuration.overrides.clicks ?? campaignAds.reduce((sum, ad) => sum + ad.clicks, 0),
    spent: configuration.overrides.spent ?? campaignAds.reduce((sum, ad) => sum + ad.spent, 0),
    conversations: campaignAds.reduce((sum, ad) => sum + (ad.conversations ?? 0), 0),
  };

  const custom = configuration.customIndicators.map(indicator => ({
    id: indicator.id,
    name: indicator.name,
    format: indicator.format,
    value: computeIndicator(indicator, realGlobal),
  }));

  const totals = {
    ...(custom.length ? { custom } : {}),
    clicks: realGlobal.clicks,
    spent: realGlobal.spent,
    conversations: realGlobal.conversations,
  };

  // Agrupamento por campanha com subtotais individuais e aplicação de overrides por campanha
  const campaignGroups: CampaignGroup[] = configuration.campaigns.map(campName => {
    const adsInCamp = selectedAds.filter(ad => ad.campaign === campName);
    const override = configuration.campaignOverrides[campName];

    const rawClicks = adsInCamp.reduce((sum, ad) => sum + ad.clicks, 0);
    const rawSpent = adsInCamp.reduce((sum, ad) => sum + ad.spent, 0);
    const rawConversations = adsInCamp.reduce((sum, ad) => sum + (ad.conversations ?? 0), 0);

    return {
      name: campName,
      totals: {
        clicks: override?.clicks ?? rawClicks,
        spent: override?.spend ?? override?.spent ?? rawSpent,
        conversations: override?.conversations ?? rawConversations,
      },
      ads: adsInCamp,
    };
  }).filter(group => group.ads.length > 0);

  return {
    ads: selectedAds,
    campaignGroups,
    showCardMetrics: configuration.showCardMetrics,
    totals,
    configuration,
  };
}
