import {
  authAccount,
  authJwks,
  authOauthAccessToken,
  authOauthClient,
  authOauthClientAssertion,
  authOauthClientResource,
  authOauthConsent,
  authOauthRefreshToken,
  authOauthResource,
  authSession,
  authUser,
  authVerification,
  createDatabase,
} from '@meme/db';
import {
  DEFAULT_SITE_URL,
  getOrigin,
  type OriginEnv,
  resolveTrustedOrigins,
} from '@meme/shared';
import { mcp } from '@better-auth/mcp';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP, jwt } from 'better-auth/plugins';
import type { D1Database } from '@cloudflare/workers-types';
import { Resend } from 'resend';

export type AuthEnv = OriginEnv & {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ADMIN_EMAILS?: string;
};

function adminEmailSet(env: AuthEnv): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function otpEmailHtml(otp: string) {
  return `<!doctype html><html><body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#fafafa;padding:32px">
  <div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px">
    <h1 style="font-size:18px;margin:0 0 12px">登录验证码</h1>
    <p style="color:#52525b;font-size:14px;margin:0 0 20px">使用下面的验证码登录，10 分钟内有效。</p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:8px">${otp}</div>
    <p style="color:#a1a1aa;font-size:12px;margin:20px 0 0">如果不是你本人操作，请忽略此邮件。</p>
  </div></body></html>`;
}

async function sendOtpEmail(
  env: AuthEnv,
  { email, otp }: { email: string; otp: string },
) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // No mail provider configured (e.g. local dev) — log so sign-in still works.
    console.warn(`[auth] RESEND_API_KEY missing; OTP for ${email}: ${otp}`);
    return;
  }
  const from = env.EMAIL_FROM ?? 'Meme <onboarding@resend.dev>';
  const result = await new Resend(apiKey).emails.send({
    from,
    to: email,
    subject: '你的登录验证码',
    html: otpEmailHtml(otp),
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to send OTP email.');
  }
}

/** MCP tool permissions, requested by clients and granted on the consent page. */
export const MCP_SCOPES = { read: 'meme:read', write: 'meme:write' } as const;
export const MCP_RESOURCE_PATH = '/api/mcp';

/**
 * Build the Better Auth instance for a given runtime env. Passwordless
 * email-OTP sign-in (auto-creates the user on first sign-in), cookie sessions,
 * a `role` field for admin gating, drizzle adapter on SQLite.
 */
export function createAuth(env: AuthEnv) {
  const db = createDatabase(env.DB);
  const baseURL =
    getOrigin(env.BETTER_AUTH_URL ?? env.SITE_URL) ?? DEFAULT_SITE_URL;

  return betterAuth({
    appName: 'Meme',
    baseURL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
        jwks: authJwks,
        oauthClient: authOauthClient,
        oauthResource: authOauthResource,
        oauthClientResource: authOauthClientResource,
        oauthRefreshToken: authOauthRefreshToken,
        oauthAccessToken: authOauthAccessToken,
        oauthConsent: authOauthConsent,
        oauthClientAssertion: authOauthClientAssertion,
      },
    }),
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user', input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const admins = adminEmailSet(env);
            const role = admins.has(user.email.toLowerCase()) ? 'admin' : 'user';
            return { data: { ...user, role } };
          },
        },
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'],
      },
      defaultCookieAttributes: {
        secure: baseURL.startsWith('https://'),
        httpOnly: true,
        sameSite: 'lax',
      },
      cookiePrefix: 'meme',
    },
    trustedOrigins: resolveTrustedOrigins(env),
    // The JWT plugin only signs MCP access tokens and serves /jwks; its own
    // session-to-JWT /token endpoint is not used (as in the MCP plugin docs).
    disabledPaths: ['/token'],
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        async sendVerificationOTP({ email, otp }) {
          await sendOtpEmail(env, { email, otp });
        },
      }),
      jwt({ disableSettingJwtHeader: true }),
      // MCP authorization server (OAuth 2.1 + RFC 9728/8707) from @better-auth/mcp.
      // Sign-in reuses the site's email-OTP login; the consent page lists the
      // requested scopes. MCP clients register themselves (RFC 7591 DCR) because
      // the Workers runtime has no DNS-pinning transport for CIMD documents.
      mcp({
        loginPage: '/login',
        consentPage: '/oauth/consent',
        resource: `${baseURL}${MCP_RESOURCE_PATH}`,
        scopes: ['openid', 'profile', 'email', 'offline_access', MCP_SCOPES.read, MCP_SCOPES.write],
        clientRegistrationDefaultScopes: ['openid', 'profile', 'offline_access', MCP_SCOPES.read],
        clientRegistrationAllowedScopes: ['openid', 'profile', 'email', 'offline_access', MCP_SCOPES.read, MCP_SCOPES.write],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        clientRegistrationDefaultApplicationType: 'infer',
        // Access tokens are signed JWTs checked against JWKS without a database
        // lookup; keep them short-lived so revocation takes effect quickly.
        accessTokenExpiresIn: 15 * 60,
        refreshTokenExpiresIn: 30 * 24 * 60 * 60,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

// Resource-server helpers for the MCP endpoint (apps/server), re-exported so the
// Worker code uses the same Better Auth packages as the authorization server.
export { requireMcpAuth } from '@better-auth/mcp';
export { createInsufficientScopeError } from 'better-auth/oauth2';
export type Session = Auth['$Infer']['Session'];
export type AuthUserInfo = Session['user'] & { role?: string };
