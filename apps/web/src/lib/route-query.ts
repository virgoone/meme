import type { QueryClient, QueryKey, FetchQueryOptions } from '@tanstack/react-query';

/** Share one pending boundary across the route chunk and its primary request. */
export async function loadPublicQuery<T, TKey extends QueryKey>(client: QueryClient, options: FetchQueryOptions<T, Error, T, TKey>) {
  // Load on the server as well: readers and crawlers receive the same full HTML.
  return client.ensureQueryData(options);
}
