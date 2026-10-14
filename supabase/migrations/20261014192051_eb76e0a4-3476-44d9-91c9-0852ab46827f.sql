ALTER TABLE public.campaign_report_links
  ADD COLUMN title TEXT NOT NULL DEFAULT 'Relatório de campanha',
  ADD COLUMN configuration JSONB NOT NULL DEFAULT '{"campaigns":[],"adIds":[],"statuses":["Ativo","Pausado"],"filters":{"q":"","sort":"recent"},"visibility":{"clicks":true,"spent":true},"overrides":{}}'::jsonb,
  ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE public.campaign_report_links
  ALTER COLUMN title DROP DEFAULT;

DROP INDEX IF EXISTS public.campaign_report_links_active_lookup_idx;
CREATE INDEX campaign_report_links_active_lookup_idx
ON public.campaign_report_links (token_hash)
WHERE revoked_at IS NULL;