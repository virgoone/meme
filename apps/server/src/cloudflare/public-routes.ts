import { createD1Database, importedPosts } from '@meme/db';
import { desc, isNotNull } from 'drizzle-orm';
import type { WorkerEnv } from '../env';
import { listImportedPosts } from '../modules/posts/service';
import { adsTxt, siteIdentity, siteInfoLinks } from '@meme/shared';
import { getPublicConfig } from '../modules/system/public-config';

const feedLimit = 100;
const redirects = new Map([
  ['/twitter', 'https://x.com/koyaguo'],
  ['/x', 'https://x.com/koyaguo'],
  ['/github', 'https://github.com/virgoone'],
  ['/tool', 'https://douni.one'],
  ['/youtube', 'https://youtube.com/@calicastle'],
]);
const feedPaths = new Set(['/feed.xml', '/feed', '/rss', '/rss.xml']);

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
  const pathname = url.pathname.replace(/\/$/, '').toLowerCase();
  const redirect = redirects.get(pathname);

  // Preserve the short links and query strings from the former Next.js config.
  if (redirect) {
    const destination = new URL(redirect);
    destination.search = url.search;
    return Response.redirect(destination.href, 308);
  }

  if (/^\/blog\/[^/]+\/?$/.test(url.pathname)) {
    const destination = new URL(siteOrigin(env));
    destination.pathname = url.pathname.replace(/^\/blog/, '').replace(/\/$/, '');
    destination.search = url.search;
    return Response.redirect(destination.href, 308);
  }

  if (url.pathname === '/robots.txt') {
    return textResponse(buildRobotsTxt(env), 'text/plain; charset=utf-8');
  }

  if (url.pathname === '/ads.txt') {
    const body = adsTxt((await getPublicConfig(env)).adsense);
    return new Response(request.method === 'HEAD' ? null : body ?? 'AdSense publisher is not configured.\n', {
      status: body ? 200 : 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' },
    });
  }

  if (url.pathname === '/sitemap.xml') {
    return textResponse(
      await buildSitemapXml(env),
      'application/xml; charset=utf-8',
    );
  }

  if (url.pathname === '/llms.txt') {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
    }
    return new Response(request.method === 'HEAD' ? null : await buildLlmsTxt(env), {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' },
    });
  }

  if (feedPaths.has(pathname)) {
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
  const raw = env.SITE_URL?.trim() || 'https://blog.douni.one';
  return new URL(raw).origin;
}

async function buildSitemapXml(env: WorkerEnv): Promise<string> {
  const origin = siteOrigin(env);
  const posts = await createD1Database(env.DB)
    .select({ slug: importedPosts.slug, publishedAt: importedPosts.publishedAt, updatedAt: importedPosts.updatedAt })
    .from(importedPosts).where(isNotNull(importedPosts.publishedAt))
    .orderBy(desc(importedPosts.publishedAt));
  const urls: SitemapEntry[] = [
    { loc: `${origin}/`, priority: '1.0' },
    { loc: `${origin}/blog`, priority: '0.8' },
    { loc: `${origin}/projects`, priority: '0.7' },
    { loc: `${origin}/guestbook`, priority: '0.6' },
    ...siteInfoLinks.map(page => ({ loc: `${origin}${page.path}`, priority: '0.3' })),
    ...posts.map((post) => ({
      loc: `${origin}/${encodeURIComponent(post.slug)}`,
      lastmod: post.updatedAt || post.publishedAt || undefined,
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

async function buildLlmsTxt(env: WorkerEnv): Promise<string> {
  const origin = siteOrigin(env);
  // Read all published entries, independent of archive pagination and the RSS limit.
  const posts = await createD1Database(env.DB)
    .select({ title: importedPosts.title, slug: importedPosts.slug, description: importedPosts.description })
    .from(importedPosts).where(isNotNull(importedPosts.publishedAt))
    .orderBy(desc(importedPosts.publishedAt));
  return `# ${siteIdentity.name}

> ${siteIdentity.description}

作者：${siteIdentity.author}。主要语言：简体中文。这里是已发布文章的内容索引；正文、版本背景、发布日期与参考来源见各篇原文。

## 站点与作者

- [文章列表](${origin}/blog): 全部技术文章与项目复盘
- [项目](${origin}/projects): 个人项目
${siteInfoLinks.map(page => `- [${page.label}](${origin}${page.path}): ${page.description}`).join('\n')}
- [GitHub](${siteIdentity.profiles[0]}): 作者公开代码
- [X](${siteIdentity.profiles[1]}): 作者公开资料

## 已发布文章

${posts.map(post => `- [${markdownText(post.title)}](${origin}/${encodeURIComponent(post.slug)}): ${markdownText(post.description || '正文与相关资料见原文。')}`).join('\n')}

## Optional

- [RSS](${origin}/feed.xml): 最近发布的文章订阅源
- [Sitemap](${origin}/sitemap.xml): 可索引页面地址与修改日期
`;
}

function markdownText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/[\\\[\]<>`*]/g, '\\$&');
}

async function buildFeedXml(env: WorkerEnv): Promise<string> {
  const origin = siteOrigin(env);
  const posts = await listImportedPosts(env, { limit: feedLimit });
  const latestPost = posts.find((post) => post.publishedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Koya 的个人博客</title>
    <link>${escapeXml(origin)}</link>
    <description>小全栈的开发记录：Cloudflare、AI 应用、SaaS 架构与远程开发。</description>
    <lastBuildDate>${new Date(latestPost?.publishedAt ?? Date.now()).toUTCString()}</lastBuildDate>
${posts
  .map((post) => {
    const link = `${origin}/${encodeURIComponent(post.slug)}`;
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
Disallow: /api/

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
