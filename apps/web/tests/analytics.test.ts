import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { Tracker } from '@evumi/tracker';

type Payload = { n: string; u: string; d: string; r?: string | null; evumi_id?: string };
const requests: { endpoint: string; payload: Payload }[] = [];
const savedGlobals = new Map<string, PropertyDescriptor | undefined>();
const browser = {
  location: new URL('https://blog.douni.one/'),
  navigator: { webdriver: false },
  localStorage: {} as Record<string, string>,
  innerHeight: 800,
  scrollY: 0,
  addEventListener() {},
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ endpoint: String(input), payload: JSON.parse(String(init?.body)) });
    return new Response(null, { status: 202 });
  },
};
let analytics: Tracker;

function setGlobal(name: string, value: unknown) {
  if (!savedGlobals.has(name)) savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

function navigate(path: string, navigationId: string, routeTemplate = path.split('?')[0]) {
  browser.location = new URL(path, 'https://blog.douni.one');
  setGlobal('location', browser.location);
  return analytics.pageview({ url: path, navigationId, routeTemplate });
}

const pageviews = () => requests.filter(request => request.payload.n === 'pageview');

beforeAll(async () => {
  setGlobal('window', browser);
  setGlobal('location', browser.location);
  setGlobal('document', {
    referrer: 'https://blog.douni.one/confirm/private-token',
    body: { scrollHeight: 1200, offsetHeight: 1200, clientHeight: 800 },
    documentElement: {},
    querySelector: () => null,
    addEventListener() {},
  });
  setGlobal('fetch', browser.fetch);
  ({ analytics } = await import('../src/lib/analytics'));
});

beforeEach(() => { requests.length = 0; });

afterAll(() => {
  for (const [name, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('Evumi collection boundaries with the real SDK and a local transport', () => {
  test('keeps public articles distinct while omitting private query data, hashes and referrers', async () => {
    const result = await navigate('/first-article?token=secret&utm_source=newsletter#heading', 'article-first', '/$slug');
    expect(result.status).toBe('sent');
    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0]).toEqual({
      endpoint: 'https://evumi.bunship.site/api/event',
      payload: { n: 'pageview', v: 33, u: 'https://blog.douni.one/first-article?utm_source=newsletter', d: 'blog.douni.one', r: null },
    });
    await navigate('/second-article', 'article-second', '/$slug');
    expect(pageviews()[1].payload.u).toBe('https://blog.douni.one/second-article');
    expect(pageviews()[1].payload.evumi_id).toBeUndefined();
  });

  test('deduplicates effect replays but counts A to B to A navigation', async () => {
    await navigate('/blog', 'archive-a');
    expect((await navigate('/blog', 'archive-a')).status).toBe('skipped');
    await navigate('/projects', 'projects-b');
    await navigate('/blog', 'archive-a');
    expect(pageviews().map(request => request.payload.u)).toEqual([
      'https://blog.douni.one/blog', 'https://blog.douni.one/projects', 'https://blog.douni.one/blog',
    ]);
  });

  test('excludes private routes and still counts back navigation from a private page', async () => {
    await navigate('/about', 'public-about');
    for (const path of ['/admin', '/admin/settings', '/login', '/confirm/private-token', '/newsletters/private-id']) {
      expect((await navigate(path, path)).status).toBe('skipped');
      expect((await analytics.track('Private event')).status).toBe('skipped');
    }
    await navigate('/about', 'public-about');
    expect(pageviews()).toHaveLength(2);
    expect(requests.every(request => !/private-token|private-id|Private event/.test(JSON.stringify(request)))).toBe(true);
  });

  test('retains archive pagination without sending unrelated query values', async () => {
    await navigate('/blog?page=2&email=private@example.com', 'archive-page-2', '/blog');
    expect(pageviews()[0].payload.u).toBe('https://blog.douni.one/blog?page=2');
  });

  test('does not initialize collection for localhost or preview origins', async () => {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://meme.moss-dev.workers.dev']) {
      browser.location = new URL(origin);
      setGlobal('location', browser.location);
      expect((await analytics.pageview()).status).toBe('skipped');
    }
    expect(requests).toHaveLength(0);
  });

  test('respects the existing Plausible opt-out flag', async () => {
    browser.localStorage.plausible_ignore = 'true';
    await navigate('/privacy', 'opt-out');
    expect(pageviews()).toHaveLength(0);
    delete browser.localStorage.plausible_ignore;
  });

  test('is safe during server rendering', async () => {
    setGlobal('window', undefined);
    expect((await analytics.pageview()).status).toBe('skipped');
    expect(requests).toHaveLength(0);
    setGlobal('window', browser);
  });
});
