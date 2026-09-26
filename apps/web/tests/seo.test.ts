import { describe, expect, test } from 'bun:test';
import { articleHead, blogArchiveHead, pageHead, siteEntityScript, infoPageHead } from '../src/lib/seo';
import { isValidPostSlug, siteInfoLinks } from '@meme/shared';
import type { PostDetail } from '../src/lib/admin-queries';

describe('public article metadata', () => {
  test('archive pages keep their own canonical instead of all pointing to page one', () => {
    expect(blogArchiveHead().links[0].href).toBe('https://blog.douni.one/blog');
    const second = blogArchiveHead(2);
    expect(second.links[0].href).toBe('https://blog.douni.one/blog?page=2');
    expect(second.meta.find(m => m.property === 'og:url')?.content).toBe(second.links[0].href);
    expect(second.meta[0].title).toContain('第 2 页');
  });
  const post: PostDetail = { id: 'one', title: 'tmux <script> test', slug: 'remote-dev', description: '断线恢复', publishedAt: '2026-09-25T01:00:00.000Z', updatedAt: '2026-09-25T02:00:00.000Z', coverImageUrl: '/api/media/cover.png', mood: null, readingTime: 8 };
  test('shares one canonical URL across head and structured data', () => {
    const head = articleHead(post);
    expect(head.links[0].href).toBe('https://blog.douni.one/remote-dev');
    const data = JSON.parse(head.scripts[0].children);
    expect(data.mainEntityOfPage).toBe(head.links[0].href);
    expect(data.image).toEqual(['https://blog.douni.one/api/media/cover.png']);
    expect(data.datePublished).toBe(post.publishedAt);
    expect(data.dateModified).toBe(post.updatedAt);
    expect(head.scripts[0].children).not.toContain('<script>');
    expect(data.headline).toBe(post.title);
    expect(head.meta.find(m => m.property === 'og:type')?.content).toBe('article');
  });
  test('fallback description contains body text rather than the site slogan', () => {
    const head = articleHead({ ...post, description: null, blocks: [{ blockId: 'one', plainText: 'Useful body text' }] });
    expect(head.meta.find(m => m.name === 'description')?.content).toBe('Useful body text');
    expect(pageHead('博客', '开发记录', '/blog').links[0].href).toBe('https://blog.douni.one/blog');
  });
  test('article and about page resolve to the same visible author and website entities', () => {
    const entities = JSON.parse(siteEntityScript().children)['@graph'];
    const author = entities.find((entity: any) => entity['@type'] === 'Person');
    const website = entities.find((entity: any) => entity['@type'] === 'WebSite');
    const article = JSON.parse(articleHead(post).scripts[0].children);
    const about = JSON.parse(infoPageHead('关于我', 'Koya', '/about', 'AboutPage').scripts[0].children);
    expect(author.sameAs).toEqual(['https://github.com/virgoone', 'https://x.com/koyaguo']);
    expect(article.author['@id']).toBe(author['@id']);
    expect(article.author.url).toBe(author.url);
    expect(about.mainEntity['@id']).toBe(author['@id']);
    expect(article.publisher['@id']).toBe(website.publisher['@id']);
    expect(article.isPartOf['@id']).toBe(website['@id']);
  });
  test('information routes cannot be shadowed by newly created article slugs', () => {
    for (const page of siteInfoLinks) {
      expect(isValidPostSlug(page.path.slice(1))).toBe(false);
      expect(isValidPostSlug(page.path.slice(1).toUpperCase())).toBe(false);
    }
    expect(isValidPostSlug('about-cloudflare')).toBe(true);
  });
});
