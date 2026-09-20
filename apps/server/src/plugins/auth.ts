import type Elysia from 'elysia';

import { getAuth } from '../auth';
import { ErrorCodes } from '../constants/errors';
import { AppError } from '../middleware/errorHandler';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role?: string;
};

async function resolveSession(headers: Headers) {
  return getAuth().api.getSession({ headers });
}

/**
 * Auth macros (modeled on fluxship's AuthPlugin). Routes opt in via options:
 *   .post('/x', ({ user }) => {...}, { auth: true })   // any signed-in user
 *   .get('/y', () => {...}, { admin: true })            // role === 'admin'
 *   .get('/z', ({ user }) => {...}, { authOptional: true })
 * The resolver throws AppError (handled by the global errorHandler) or injects
 * `user` / `session` into the handler context.
 */
export const AuthPlugin = (app: Elysia) =>
  app.macro({
    admin: {
      async resolve({ request }) {
        const session = await resolveSession(request.headers);
        if (!session) {
          throw AppError.unauthorized(
            '未授权：需要登录',
            ErrorCodes.AUTH_UNAUTHORIZED,
          );
        }
        if ((session.user as SessionUser)?.role !== 'admin') {
          throw AppError.forbidden(
            '禁止访问：需要管理员权限',
            ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
          );
        }
        return {
          user: session.user as SessionUser,
          session: session.session,
        };
      },
    },
    auth: {
      async resolve({ request }) {
        const session = await resolveSession(request.headers);
        if (!session) {
          throw AppError.unauthorized(
            '未授权：需要登录',
            ErrorCodes.AUTH_UNAUTHORIZED,
          );
        }
        return {
          user: session.user as SessionUser,
          session: session.session,
        };
      },
    },
    authOptional: {
      async resolve({ request }) {
        const session = await resolveSession(request.headers);
        return {
          user: (session?.user ?? null) as SessionUser | null,
          session: session?.session ?? null,
        };
      },
    },
  });
