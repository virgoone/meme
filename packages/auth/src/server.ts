import {
  authAccount,
  authSession,
  authUser,
  authVerification,
  createD1Database,
} from '@meme/db';
import {
  DEFAULT_SITE_URL,
  getOrigin,
  type OriginEnv,
  resolveTrustedOrigins,
} from '@meme/shared';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
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

/**
 * Build the Better Auth instance for a given runtime env. Passwordless
 * email-OTP sign-in (auto-creates the user on first sign-in), cookie sessions,
 * a `role` field for admin gating, drizzle adapter on D1.
 */
export function createAuth(env: AuthEnv) {
  const db = createD1Database(env.DB);
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
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        async sendVerificationOTP({ email, otp }) {
          await sendOtpEmail(env, { email, otp });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth['$Infer']['Session'];
export type AuthUserInfo = Session['user'] & { role?: string };
