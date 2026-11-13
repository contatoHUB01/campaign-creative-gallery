<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application structure
- Keep locale formatters and the shared ad type in `src/lib/ads.ts`; production report rows come from the Meta API, not the simulated dataset.
- Render each ad through `CreativeCard`, with all shared visual tokens in `src/styles.css`, so card presentation remains consistent across filters.
- Keep Meta credentials inside authenticated server functions and use `src/lib/metaApi.ts` for Query integration; this prevents exposing credentials or private report data to unauthenticated callers.
- Read the ads endpoint with nested campaign, creative and insights fields and normalize metrics to finite numbers; creative content alone does not provide performance data.
- Allow only Meta ad accounts returned by the workspace token's /me/adaccounts list, checked in authenticated server functions; saved reports store their accountId (legacy rows fall back to the original account).
- Keep one root auth transition subscriber and clear private report queries on sign-out; private data must not survive logout in the UI.
- Sign-in uses email and password for existing accounts only (no self sign-up); report access is for authorized accounts.
- Keep client report links revocable, non-expiring, owner-editable, and scoped server-side to their saved report configuration; never trust URL filters or expose stored token hashes.
- Canonicalize valid shared-token query URLs to the public read-only report route before loading the authenticated report; this prevents the sign-in screen from blocking clients.
- Keep report validation, campaign totals, filtering, and public metric redaction in `src/lib/report-configuration.ts`; shared responses must remove hidden metrics before serialization.
