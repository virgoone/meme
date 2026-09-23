import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { rateLimit } from '../shared';

const linkPreviewWidth = 1200;
const linkPreviewHeight = 750;

export const linkPreviewModule = new Elysia({
  prefix: '/link-preview',
}).get('/', async ({ query, request }) => {
  const env = getCloudflareRuntimeEnv();
  if (!query.url || !env.LINK_PREVIEW_API_BASE_URL) {
    return Response.json(
      { error: 'missing_link_preview_config' },
      { status: 400 },
    );
  }
  const limited = await rateLimit(request, 'link-preview', {
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  const imageUrl = new URL(`${env.LINK_PREVIEW_API_BASE_URL}/jpeg`);
  imageUrl.searchParams.set('url', query.url);
  imageUrl.searchParams.set('width', String(linkPreviewWidth));
  imageUrl.searchParams.set('height', String(linkPreviewHeight));
  imageUrl.searchParams.set('ttl', '86400');

  return Response.redirect(imageUrl.toString(), 302);
});
