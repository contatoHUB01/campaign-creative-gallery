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
- Keep the Meta account input allowlisted in the authenticated server function and disable shared response caching; workspace credentials must not allow arbitrary account reads.
- Keep one root auth transition subscriber and clear private report queries on sign-out; private data must not survive logout in the UI.
- Magic Link requests must not create new users automatically; report access is for existing authorized accounts.
- Keep client report links revocable, non-expiring, owner-editable, and scoped server-side to their saved report configuration; never trust URL filters or expose stored token hashes.
- Canonicalize valid shared-token query URLs to the public read-only report route before loading the authenticated report; this prevents the sign-in screen from blocking clients.
