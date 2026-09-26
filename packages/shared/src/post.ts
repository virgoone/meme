export function createPostSlug(title: string): string {
  return title.normalize('NFKC').toLowerCase().trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '').slice(0, 180).replace(/-+$/g, '');
}

export function isValidPostSlug(slug: string): boolean {
  return slug.length <= 200 && /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)
    && !['new', 'admin', 'api', 'blog', 'projects', 'guestbook', 'feed', 'rss', 'login', 'twitter', 'x', 'github', 'tool', 'youtube', 'about', 'contact', 'privacy', 'terms'].includes(slug.toLowerCase());
}
