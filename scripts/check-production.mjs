import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const origins = process.argv.slice(2);
if (!origins.length) {
  origins.push('https://meme.moss-dev.workers.dev', 'https://blog.douni.one');
}

async function check(origin, path, verify) {
  const url = new URL(path, origin);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'MemeDeploymentBot/1.0', 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(15_000),
      });
      assert.equal(response.status, 200, `HTTP ${response.status}`);
      await verify(response);
      console.log(`PASS ${url}`);
      return;
    } catch (error) {
      if (attempt === 5) throw new Error(`Failed ${url}: ${error.message}`, { cause: error });
      console.warn(`Retry ${attempt}/5 ${url}: ${error.message}`);
      await delay(5_000);
    }
  }
}

for (const origin of origins) {
  await check(origin, '/api/health', async (response) => {
    const health = await response.json();
    assert.equal(health.ok, true);
    assert.equal(health.runtime, 'cloudflare-workers');
    assert.equal(health.appEnv, 'production');
  });
  await check(origin, '/blog', async (response) => {
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    const html = await response.text();
    assert.match(html, /<h1\b/);
    assert.match(html, /https:\/\/blog\.douni\.one\/blog/);
  });
  await check(origin, '/api/posts?limit=1', async (response) => {
    const posts = await response.json();
    assert.ok(Array.isArray(posts) && posts.length > 0, 'Published posts missing');
    assert.ok(posts[0].slug && posts[0].title, 'Post data is incomplete');
  });
  await check(origin, '/sitemap.xml', async (response) => {
    const xml = await response.text();
    assert.match(xml, /<urlset\b/);
    assert.match(xml, /<loc>https:\/\/blog\.douni\.one\/blog<\/loc>/);
  });
  await check(origin, '/feed.xml', async (response) => {
    const xml = await response.text();
    assert.match(xml, /<rss\b/);
    assert.match(xml, /<item>/);
  });
}
