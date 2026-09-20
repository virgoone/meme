import { mkdir, writeFile } from 'node:fs/promises';

const rawOrigin = process.env.CLOUDFLARE_ORIGIN;
if (!rawOrigin) throw new Error('CLOUDFLARE_ORIGIN is required.');

const origin = new URL(rawOrigin);
if (
  origin.protocol !== 'https:' ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash ||
  !origin.hostname.endsWith('.workers.dev')
) {
  throw new Error('CLOUDFLARE_ORIGIN must be an HTTPS workers.dev origin.');
}

// Keep SSR, auth, uploads, and assets on the existing Worker and its bindings.
await mkdir('.vercel/output', { recursive: true });
await writeFile(
  '.vercel/output/config.json',
  `${JSON.stringify({
    version: 3,
    routes: [{ src: '/(.*)', dest: `${origin.origin}/$1` }],
  }, null, 2)}\n`,
);
console.log(`Vercel routes all requests to ${origin.origin}`);
