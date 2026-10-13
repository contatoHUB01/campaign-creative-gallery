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
- The adcreatives endpoint supplies creative content only; its placeholder campaign, status, and zero metrics are not campaign performance measurements.
