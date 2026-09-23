import { describe, expect, mock, test } from 'bun:test';
import type { WorkerEnv } from '../env';
import { handlePublicRoute } from './public-routes';

const origin = 'https://blog.douni.one';

describe('legacy public redirects', () => {
  test.each([
    ['/twitter', 'https://x.com/koyaguo'],
    ['/x', 'https://x.com/koyaguo'],
    ['/github', 'https://github.com/virgoone'],
    ['/tool', 'https://douni.one/'],
    ['/youtube', 'https://youtube.com/@calicastle'],
  ])('%s permanently redirects to %s without storage access', async (path, destination) => {
    for (const method of ['GET', 'HEAD']) {
      for (const pathname of [path, `${path}/`, path.toUpperCase()]) {
        const response = await handlePublicRoute(
          new Request(`${origin}${pathname}`, { method }),
          {} as WorkerEnv,
        );
        expect(response?.status).toBe(308);
        expect(response?.headers.get('location')).toBe(destination);
      }
    }
  });

  test('preserves query strings without accepting an arbitrary redirect destination', async () => {
    const search = '?utm_source=blog&tag=one&tag=two&next=https%3A%2F%2Fexample.com';
    const response = await handlePublicRoute(
      new Request(`${origin}/github${search}`),
      {} as WorkerEnv,
    );
    expect(response?.headers.get('location')).toBe(`https://github.com/virgoone${search}`);
  });

  test.each(['/', '/blog', '/twitter/post', '/api/github', '/constructor', '/toString'])(
    'does not intercept unrelated route %s', async (path) => {
      expect(await handlePublicRoute(new Request(`${origin}${path}`), {} as WorkerEnv)).toBeNull();
    },
  );
});

describe('legacy RSS aliases', () => {
  test.each(['/feed.xml', '/feed', '/rss', '/rss.xml', '/rss/'])(
    '%s serves the feed instead of the article page', async (path) => {
      const raw = mock(async () => []);
      const env = {
        SITE_URL: origin,
        DB: { prepare: () => ({ bind: () => ({ raw }) }) },
      } as unknown as WorkerEnv;
      const response = await handlePublicRoute(new Request(`${origin}${path}?source=reader`), env);
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
      expect(response?.headers.get('location')).toBeNull();
      expect(await response?.text()).toContain(`<link>${origin}</link>`);
      expect(raw).toHaveBeenCalledTimes(1);
    },
  );
});
