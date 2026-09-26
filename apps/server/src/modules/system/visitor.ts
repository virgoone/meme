import type { WorkerEnv } from '../../env';

export type VisitorGeolocation = { country: string; city: string; flag: string; visitedAt?: number };
export const lastVisitorKey = 'analytics:last-visitor';

export function visitorFromRequest(request: Request): VisitorGeolocation | null {
  // Only use Cloudflare's edge metadata, never caller-supplied location fields.
  // A request forwarded by Vercel describes the proxy, not the reader.
  if (request.headers.has('x-vercel-id') || request.headers.has('x-vercel-ip-country')) return null;
  const cf = (request as Request & { cf?: { country?: unknown; city?: unknown } }).cf;
  if (typeof cf?.country !== 'string' || !/^[A-Z]{2}$/.test(cf.country) || ['XX', 'T1'].includes(cf.country)) return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Strip control characters from externally supplied display text.
  const city = typeof cf.city === 'string' ? cf.city.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100) : '';
  const flag = [...cf.country].map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join('');
  return { country: cf.country, city, flag, visitedAt: Date.now() };
}

export async function readLastVisitor(env: WorkerEnv): Promise<VisitorGeolocation> {
  const rows = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(lastVisitorKey).all<{ value: string }>();
  if (rows.results[0]?.value) {
    try {
      const visitor = JSON.parse(rows.results[0].value) as VisitorGeolocation;
      if (typeof visitor.country === 'string' && typeof visitor.city === 'string' && typeof visitor.flag === 'string') return visitor;
    } catch { /* An invalid old value must not break the footer. */ }
  }
  return await env.MEME_KV.get<VisitorGeolocation>('last_visitor', 'json') ?? { country: '', city: '', flag: '' };
}
