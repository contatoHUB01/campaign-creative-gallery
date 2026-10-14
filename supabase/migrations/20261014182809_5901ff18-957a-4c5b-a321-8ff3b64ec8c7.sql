CREATE POLICY "Service role manages campaign report links"
ON public.campaign_report_links
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);