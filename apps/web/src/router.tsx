import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';
import { RoutePendingSkeleton } from './lib/page-skeletons';

export function getRouter() {
  return createRouter({
    routeTree,
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
