import { getCloudflareRuntimeEnv } from '../../../server/src/cloudflare/runtime';
import { getImportedPostBySlug, listImportedPosts, listPublishedPostPage } from '../../../server/src/modules/posts/service';
import { listProjects } from '../../../server/src/modules/projects/service';
import { listGuestbookEntries } from '../../../server/src/modules/guestbook/service';
import { getPublicConfig } from '../../../server/src/modules/system/public-config';

/** Public SSR reads only. Never forward cookies or expose admin/settings APIs. */
export async function readPublicData(path: string): Promise<unknown> {
  if (import.meta.env.DEV) {
    const response = await fetch(`http://127.0.0.1:8787${path}`);
    if (!response.ok) throw Object.assign(new Error('内容暂时不可用'), { statusCode: response.status });
    return response.json();
  }
  const env = getCloudflareRuntimeEnv();
  const url = new URL(path, 'https://public.invalid');
  const limit = Number(url.searchParams.get('limit')) || undefined;
  if (url.pathname === '/api/public-config') return getPublicConfig(env);
  if (url.pathname === '/api/posts') return url.searchParams.has('page')
    ? listPublishedPostPage(env, url.searchParams.get('page'))
    : listImportedPosts(env, { limit });
  if (url.pathname === '/api/projects') return listProjects(env, limit);
  if (url.pathname === '/api/guestbook') return listGuestbookEntries(env, limit);
  if (/^\/api\/posts\/[^/]+$/.test(url.pathname)) {
    const post = await getImportedPostBySlug(env, decodeURIComponent(url.pathname.slice('/api/posts/'.length)));
    if (!post) throw Object.assign(new Error('文章不存在'), { statusCode: 404 });
    return post;
  }
  throw new Error('This API is not available to public SSR');
}
