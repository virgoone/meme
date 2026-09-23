/**
 * Better Auth uses same-origin cookie sessions, so authenticated API requests
 * just need credentials included — there is no bearer token to manage.
 */
export function useAuthedFetch() {
  return async (input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (!headers.has('accept')) headers.set('accept', 'application/json');
    return fetch(input, { ...init, headers, credentials: 'include' });
  };
}
