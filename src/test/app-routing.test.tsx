import { QueryClient } from "@tanstack/react-query";
import { createRouter, isRedirect, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("redirects a token query to the read-only shared report route", async () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const token = "a".repeat(64);

    await router.navigate({ to: "/", search: { token } as never }).catch(error => {
      expect(isRedirect(error)).toBe(true);
    });

    expect(router.state.location.pathname).toBe(`/report/${token}`);
  });
});
