import type { PostDetail } from './admin-queries';
import { siteIdentity } from '@meme/shared';

export const siteUrl = siteIdentity.url;
export const siteName = siteIdentity.name;
export const siteDescription = siteIdentity.description;
const authorId = `${siteUrl}/#author`;
const websiteId = `${siteUrl}/#website`;

function jsonLd(data: unknown) {
  return { type: 'application/ld+json', children: JSON.stringify(data).replace(/</g, '\\u003c') };
}

export function siteEntityScript() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person', '@id': authorId,
        name: siteIdentity.author, url: `${siteUrl}/about`,
        image: `${siteUrl}/portrait.png`,
        sameAs: siteIdentity.profiles,
      },
      {
        '@type': 'WebSite', '@id': websiteId,
        name: siteName, url: `${siteUrl}/`, description: siteDescription,
        inLanguage: 'zh-CN', publisher: { '@id': authorId },
      },
    ],
  });
}

export function infoPageHead(title: string, description: string, path: string, type: 'AboutPage' | 'ContactPage' | 'WebPage' = 'WebPage') {
  return {
    ...pageHead(title, description, path),
    scripts: [jsonLd({
      '@context': 'https://schema.org', '@type': type,
      '@id': `${siteUrl}${path}#page`, url: `${siteUrl}${path}`, name: title,
      description, inLanguage: 'zh-CN',
      isPartOf: { '@id': websiteId },
      ...(type === 'AboutPage' ? { mainEntity: { '@id': authorId } } : {}),
    })],
  };
}

export function pageHead(title: string, description: string, path: string, image?: string | null) {
  const url = new URL(path, siteUrl).href;
  const cover = image ? new URL(image, siteUrl).href : `${siteUrl}/apple-touch-icon.png`;
  return {
    meta: [
      { title: `${title} | ${siteName}` },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'zh_CN' },
      { property: 'og:site_name', content: siteName },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: cover },
      { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: cover },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}

export function articleHead(post: PostDetail) {
  const description = post.description || post.blocks?.map(block => block.plainText || '').join(' ').slice(0, 150) || post.title;
  const head = pageHead(post.title, description, `/${encodeURIComponent(post.slug)}`, post.coverImageUrl);
  const url = `${siteUrl}/${encodeURIComponent(post.slug)}`;
  return {
    ...head,
    meta: [
      ...head.meta.filter(meta => meta.property !== 'og:type'),
      { property: 'og:type', content: 'article' },
      ...(post.publishedAt ? [{ property: 'article:published_time', content: post.publishedAt }] : []),
      ...(post.updatedAt ? [{ property: 'article:modified_time', content: post.updatedAt }] : []),
    ],
    scripts: [jsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: post.title,
      description,
      mainEntityOfPage: url,
      url,
      inLanguage: 'zh-CN',
      author: { '@type': 'Person', '@id': authorId, name: siteIdentity.author, url: `${siteUrl}/about` },
      publisher: { '@id': authorId },
      isPartOf: { '@id': websiteId },
      ...(post.coverImageUrl ? { image: [new URL(post.coverImageUrl, siteUrl).href] } : {}),
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    })],
  };
}

export function blogArchiveHead(page = 1) {
  return pageHead(
    `技术博客与项目复盘${page > 1 ? ` · 第 ${page} 页` : ''}`,
    '浏览 Koya 的技术文章：Cloudflare Workers、AI 生成工作流、支付与上传、离线同步、远程开发及个人项目复盘。',
    page > 1 ? `/blog?page=${page}` : '/blog',
  );
}

export const privateHead = () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
