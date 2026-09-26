import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';
import { RoutePendingSkeleton } from './lib/page-skeletons';

export function getRouter() {
  // A separate cache per SSR request; transfer only successful public reads.
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
  return createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () => ({ queryState: JSON.stringify(dehydrate(queryClient, { shouldDehydrateQuery: q => q.queryKey[0] === 'public' && q.state.status === 'success' })) }),
    hydrate: (state: { queryState: string }) => hydrate(queryClient, JSON.parse(state.queryState)),
    scrollRestoration: true,
    defaultPendingComponent: RoutePendingSkeleton,
    defaultPendingMs: 120,
    defaultPendingMinMs: 180,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
