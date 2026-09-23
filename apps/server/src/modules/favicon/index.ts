import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';

const fallbackIcon = 'https://cali.so/favicon_blank.png';
const faviconRevalidateSeconds = 60 * 60 * 24 * 3;

const faviconMapper: Record<string, string> = {
  '((?:zolplay.cn)|(?:zolplay.com)|(?:cn.zolplay.com))':
    'https://cali.so/favicons/zolplay.png',
  '(?:github.com)': 'https://cali.so/favicons/github.png',
  '((?:t.co)|(?:twitter.com)|(?:x.com))':
    'https://cali.so/favicons/twitter.png',
  'coolshell.cn': 'https://cali.so/favicons/coolshell.png',
  'vercel.com': 'https://cali.so/favicons/vercel.png',
  'nextjs.org': 'https://cali.so/favicons/nextjs.png',
};

function predefinedIcon(rawUrl: string): string | null {
  for (const [pattern, icon] of Object.entries(faviconMapper)) {
    const regex = new RegExp(
      `^(?:https?:\\/\\/)?(?:[^@/\\n]+@)?(?:www\\.)?${pattern}`,
    );
    if (regex.test(rawUrl)) return icon;
  }
  return null;
}

function normalizeTarget(rawUrl: string): URL {
  return new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
}

function extractIconHref(html: string): string | null {
  const rels = ['apple-touch-icon', 'icon', 'shortcut icon'];
  for (const rel of rels) {
    const regex = new RegExp(
      `<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["']`,
      'i',
    );
    const match = html.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function resolveFavicon(rawUrl: string): Promise<string> {
  const env = getCloudflareRuntimeEnv();
  const mapped = predefinedIcon(rawUrl);
  if (mapped) return mapped;

  const cacheKey = `favicon:${rawUrl}`;
  const cached = await env.MEME_KV.get(cacheKey);
  if (cached) return cached;

  let iconUrl = fallbackIcon;
  try {
    const targetUrl = normalizeTarget(rawUrl);
    const response = await fetch(targetUrl, {
      headers: { accept: 'text/html' },
    });
    if (response.ok) {
      const href = extractIconHref(await response.text());
      if (href) iconUrl = new URL(href, targetUrl).href;
    }
  } catch {
    iconUrl = fallbackIcon;
  }

  await env.MEME_KV.put(cacheKey, iconUrl, {
    expirationTtl: faviconRevalidateSeconds,
  });
  return iconUrl;
}

export const faviconModule = new Elysia({ prefix: '/favicon' }).get(
  '/',
  async ({ query, request }) => {
    if (!query.url) {
      return Response.json({ error: 'missing_url' }, { status: 400 });
    }
    const limited = await rateLimit(request, 'favicon', {
      limit: 60,
      windowSeconds: 60,
    });
    if (limited) return limited;
    return Response.redirect(await resolveFavicon(query.url), 302);
  },
);
