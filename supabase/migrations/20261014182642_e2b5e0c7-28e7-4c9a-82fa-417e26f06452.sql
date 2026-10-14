CREATE TABLE public.campaign_report_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.campaign_report_links TO service_role;

ALTER TABLE public.campaign_report_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_campaign_report_links_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_campaign_report_links_updated_at
BEFORE UPDATE ON public.campaign_report_links
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_report_links_updated_at();

CREATE INDEX campaign_report_links_active_lookup_idx
ON public.campaign_report_links (token_hash, expires_at)
WHERE revoked_at IS NULL;