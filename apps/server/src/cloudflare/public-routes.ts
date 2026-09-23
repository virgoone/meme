import type { WorkerEnv } from '../env';
import { listImportedPosts } from '../modules/posts/service';

const feedLimit = 100;
type SitemapEntry = {
  loc: string;
  priority: string;
  lastmod?: string;
};

export async function handlePublicRoute(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return textResponse(buildRobotsTxt(env), 'text/plain; charset=utf-8');
  }

  if (url.pathname === '/sitemap.xml') {
    return textResponse(
      await buildSitemapXml(env),
      'application/xml; charset=utf-8',
    );
  }

  if (url.pathname === '/feed.xml') {
    return textResponse(
      await buildFeedXml(env),
      'application/rss+xml; charset=utf-8',
    );
  }

  return null;
}

function textResponse(body: string, contentType: string) {
  return new Response(body, {
    headers: {
      'cache-control': 'public, max-age=300',
      'content-type': contentType,
    },
  });
}

function siteOrigin(env: WorkerEnv): string {
  const raw = env.SITE_URL?.trim() || 'https://example.com';
  return new URL(raw).origin;
}

async function buildSitemapXml(env: WorkerEnv): Promise<string> {
  const origin = siteOrigin(env);
  const posts = await listImportedPosts(env, { limit: feedLimit });
  const urls: SitemapEntry[] = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/blog`, priority: '0.8' },
    { loc: `${origin}/projects`, priority: '0.7' },
    { loc: `${origin}/guestbook`, priority: '0.6' },
    ...posts.map((post) => ({
      loc: `${origin}/blog/${encodeURIComponent(post.slug)}`,
      lastmod: post.publishedAt ?? undefined,
      priority: '0.7',
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
${entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod.slice(0, 10))}</lastmod>\n` : ''}    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
}

async function buildFeedXml(env: WorkerEnv): Promise<string> {
  const origin = siteOrigin(env);
  const posts = await listImportedPosts(env, { limit: feedLimit });
  const latestPost = posts.find((post) => post.publishedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Meme</title>
    <link>${escapeXml(origin)}</link>
    <description>Latest imported posts from Meme.</description>
    <lastBuildDate>${new Date(latestPost?.publishedAt ?? Date.now()).toUTCString()}</lastBuildDate>
${posts
  .map((post) => {
    const link = `${origin}/blog/${encodeURIComponent(post.slug)}`;
    return `    <item>
      <guid>${escapeXml(link)}</guid>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(post.description ?? '')}</description>
${post.publishedAt ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>\n` : ''}    </item>`;
  })
  .join('\n')}
  </channel>
</rss>
`;
}

function buildRobotsTxt(env: WorkerEnv): string {
  const origin = siteOrigin(env);
  return `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
