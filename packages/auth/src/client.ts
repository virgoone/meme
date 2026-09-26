import {
  emailOTPClient,
  inferAdditionalFields,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import type { Auth } from './server';

// Same-origin by default (apps/web proxies /api to the Worker). Set
// VITE_API_BASE_URL for a cross-origin deploy.
const baseURL = (
  import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }
).env?.VITE_API_BASE_URL?.replace(/\/+$/, '');

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  basePath: '/api/auth',
  sessionOptions: {
    // The singleton already shares one session atom across all useSession calls.
    // Keep focus refresh and Better Auth's built-in throttling, plus periodic,
    // reconnect, and auth mutation/broadcast synchronization.
    refetchOnWindowFocus: true,
    refetchInterval: 300,
    refetchWhenOffline: false,
  },
  plugins: [
    emailOTPClient(),
    inferAdditionalFields<Auth>({ user: { role: { type: 'string' } } }),
  ],
});

export const { useSession, signIn, signOut, emailOtp } = authClient;
