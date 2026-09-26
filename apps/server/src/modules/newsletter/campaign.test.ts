import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { Elysia } from 'elysia';
import type { WorkerEnv } from '../../env';
import { exposeCloudflareRuntime } from '../../cloudflare/runtime';
import { errorHandler } from '../../middleware/errorHandler';
import {
  getCampaign,
  newsletterOptions,
  saveCampaign,
  sendCampaignStep,
  unsubscribeNewsletter,
  type CampaignInput,
} from './campaign';
import { getNewsletterById, listNewsletters } from './service';
import { renderNewsletter } from '@meme/shared';

let role: string | null = 'admin';
mock.module('../../auth', () => ({
  getAuth: () => ({
    api: {
      getSession: async () =>
        role
          ? {
              user: { id: 'test', role, email: 'admin@example.test' },
              session: {},
            }
          : null,
    },
  }),
}));
const { newsletterAdminModule } = await import('./admin');
const app = new Elysia({ aot: false })
  .use(errorHandler)
  .use(newsletterAdminModule);
let sqlite: Database;
let env: WorkerEnv;
const originalFetch = globalThis.fetch;
let calls: { payload: Record<string, unknown>; key: string }[];
const id = 'b5ac8bb0-f0bd-4e8d-af7a-06a276390452';
const input: CampaignInput = {
  version: 1,
  subject: '最近更新',
  headline: '最近写了这些',
  introduction: '你好，读者',
  template: 'digest',
  includeDescriptions: true,
  posts: [{ id: 'post-1', title: '邮件内的标题', description: '邮件内的摘要' }],
};
function request(path: string, method = 'GET', body?: unknown) {
  return app.handle(
    new Request(`http://localhost/admin/newsletters${path}`, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }),
    }),
  );
}
beforeEach(() => {
  role = 'admin';
  calls = [];
  sqlite = new Database(':memory:');
  for (const migration of [
    '0000_content_migration_control',
    '0001_legacy_turso_tables',
    '0004_settings',
    '0005_newsletter_campaigns',
  ])
    sqlite.exec(
      readFileSync(
        new URL(
          `../../../../../packages/db/drizzle/${migration}.sql`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
  sqlite.exec(`INSERT INTO imported_posts (id, sanity_id, title, slug, description, portable_text_json, published_at) VALUES ('post-1','post-1','原始标题','real-post','原始摘要','[]','2020-01-01');
    INSERT INTO subscribers (id,email,subscribed_at,unsubscribed_at) VALUES (1,'one@example.test',1,NULL),(2,'pending@example.test',NULL,NULL),(3,'out@example.test',1,'2025-01-01'),(4,'two@example.test',1,NULL),(5,' ONE@example.test ',1,NULL);`);
  class Statement {
    values: (string | number | null)[] = [];
    constructor(readonly sql: string) {}
    bind(...values: (string | number | null)[]) {
      this.values = values;
      return this;
    }
    raw() {
      return Promise.resolve(sqlite.prepare(this.sql).values(...this.values));
    }
    first() {
      return Promise.resolve(sqlite.prepare(this.sql).get(...this.values));
    }
    run() {
      return Promise.resolve({
        meta: sqlite.prepare(this.sql).run(...this.values),
      });
    }
    all() {
      return Promise.resolve(this.execute());
    }
    execute() {
      return {
        success: true,
        results: sqlite.prepare(this.sql).all(...this.values),
        meta: {},
      };
    }
  }
  env = {
    RESEND_API_KEY: 'test-key',
    EMAIL_FROM: 'Blog <blog@example.test>',
    SITE_URL: 'https://blog.example.test',
    DB: {
      prepare: (sql: string) => new Statement(sql),
      batch: (statements: Statement[]) =>
        Promise.resolve(
          sqlite.transaction(() =>
            statements.map((statement) => statement.execute()),
          )(),
        ),
    },
  } as unknown as WorkerEnv;
  exposeCloudflareRuntime(env);
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    calls.push({
      payload: JSON.parse(String(init?.body)),
      key: new Headers(init?.headers).get('Idempotency-Key') ?? '',
    });
    return Response.json({ id: 'email-accepted' });
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  sqlite.close();
});

test('recipient count excludes pending and unsubscribed users, deduplicates email', async () => {
  expect((await newsletterOptions(env)).recipients).toBe(2);
  expect((await newsletterOptions({ ...env, RESEND_API_KEY: '' })).ready).toBe(
    false,
  );
});
test('drafts persist custom copy and canonical article URLs; public cannot read drafts', async () => {
  const saved = await saveCampaign(env, id, input);
  expect(saved.draft.posts[0].slug).toBe('real-post');
  expect(saved.draft.posts[0].title).toBe('邮件内的标题');
  await saveCampaign(env, id, { ...input, subject: '保存的更新' });
  expect((await getCampaign(env, id)).draft.subject).toBe('保存的更新');
  expect((await listNewsletters(env))[0]).toMatchObject({
    campaignId: id,
    campaignStatus: 'draft',
  });
  expect(sqlite.query('SELECT count(*) AS n FROM newsletters').get()).toEqual({
    n: 1,
  });
  expect(await getNewsletterById(env, saved.newsletterId)).toBeNull();
  expect(calls).toHaveLength(0);
});
test('draft or future posts cannot be included in an update', async () => {
  sqlite.exec('UPDATE imported_posts SET published_at = NULL');
  await expect(saveCampaign(env, id, input)).rejects.toThrow('尚未发布');
  sqlite.exec("UPDATE imported_posts SET published_at = '2999-01-01'");
  await expect(saveCampaign(env, id, input)).rejects.toThrow('尚未发布');
});
test('sends individual messages, freezes content and never replays a completed delivery', async () => {
  await saveCampaign(env, id, input);
  expect((await sendCampaignStep(env, id, 2)).accepted).toBe(1);
  await expect(
    saveCampaign(env, id, { ...input, subject: 'changed' }),
  ).rejects.toThrow('锁定');
  expect((await sendCampaignStep(env, id, 2)).status).toBe('sent');
  await sendCampaignStep(env, id, 2);
  expect(calls).toHaveLength(2);
  expect(calls.map((call) => call.payload.to)).toEqual([
    ['one@example.test'],
    ['two@example.test'],
  ]);
  expect(String(calls[0].payload.html)).toContain(
    '/api/newsletter/unsubscribe/',
  );
  expect(String(calls[0].payload.html)).not.toContain('two@example.test');
  expect(
    (await getNewsletterById(env, (await getCampaign(env, id)).newsletterId))
      ?.sentAt,
  ).not.toBeNull();
});
test('changed audience requires confirmation; unsubscribes between steps are skipped', async () => {
  await saveCampaign(env, id, input);
  await expect(sendCampaignStep(env, id, 99)).rejects.toThrow('订阅人数已变化');
  expect(calls).toHaveLength(0);
  await sendCampaignStep(env, id, 2);
  sqlite.exec(
    "UPDATE subscribers SET unsubscribed_at = '2026-09-24' WHERE id = 4",
  );
  const result = await sendCampaignStep(env, id, 2);
  expect(result).toMatchObject({ status: 'sent', accepted: 1, skipped: 1 });
  expect(calls).toHaveLength(1);
});
test('ambiguous provider success retries the same payload and idempotency key', async () => {
  await saveCampaign(env, id, input);
  sqlite.exec(
    "CREATE TRIGGER fail_result BEFORE UPDATE OF provider_id ON newsletter_deliveries BEGIN SELECT RAISE(ABORT, 'test write failure'); END;",
  );
  await expect(sendCampaignStep(env, id, 2)).rejects.toThrow(
    'test write failure',
  );
  sqlite.exec('DROP TRIGGER fail_result');
  await sendCampaignStep(env, id, 2);
  expect(calls).toHaveLength(2);
  expect(calls[0]).toEqual(calls[1]);
});
test('an uncertain delivery older than the provider deduplication window is not replayed', async () => {
  await saveCampaign(env, id, input);
  await sendCampaignStep(env, id, 2);
  sqlite
    .prepare(
      'UPDATE newsletter_deliveries SET attempted_at = ? WHERE subscriber_id = 4',
    )
    .run(Date.now() - 25 * 60 * 60 * 1000);
  await expect(sendCampaignStep(env, id, 2)).rejects.toThrow('时限');
  expect(calls).toHaveLength(1);
});
test('concurrent sends are serialized by a durable campaign lease', async () => {
  await saveCampaign(env, id, input);
  const results = await Promise.allSettled([
    sendCampaignStep(env, id, 2),
    sendCampaignStep(env, id, 2),
  ]);
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(calls).toHaveLength(1);
});
test('unsubscribe GET is read-only, POST changes only the token recipient', async () => {
  await saveCampaign(env, id, input);
  await sendCampaignStep(env, id, 2);
  const row = sqlite
    .query(
      'SELECT unsubscribe_token FROM newsletter_deliveries WHERE subscriber_id = 1',
    )
    .get() as { unsubscribe_token: string };
  expect(
    (await unsubscribeNewsletter(env, row.unsubscribe_token, false)).status,
  ).toBe(200);
  expect((await newsletterOptions(env)).recipients).toBe(2);
  await unsubscribeNewsletter(env, row.unsubscribe_token, true);
  // Duplicate legacy record must not allow a removed address to re-enter a later campaign.
  expect((await newsletterOptions(env)).recipients).toBe(1);
});
test('all three email templates escape copy and reject unsafe image URLs', async () => {
  const { draft } = await saveCampaign(env, id, input);
  for (const template of ['digest', 'visual', 'featured'] as const) {
    const html = renderNewsletter(
      {
        ...draft,
        template,
        headline: '<script>x</script>',
        posts: [
          {
            ...draft.posts[0],
            title: '<img onerror=alert(1)>',
            coverImageUrl: 'javascript:alert(1)',
          },
        ],
      },
      { siteUrl: 'https://blog.example.test' },
    ).html;
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('src="javascript:');
    expect(html).toContain('https://blog.example.test/real-post');
  }
});
test('admin endpoints enforce roles and payload validation; test sends only to the session email', async () => {
  for (const current of [null, 'user']) {
    role = current;
    for (const [path, method, body] of [
      ['/options', 'GET', undefined],
      [`/campaign/${id}`, 'GET', undefined],
      [`/campaign/${id}`, 'PUT', input],
      [`/campaign/${id}/send`, 'POST', { recipientCount: 2 }],
      [`/campaign/${id}/test`, 'POST', { attemptId: id }],
    ] as const) {
      expect((await request(path, method, body)).status).toBe(
        current ? 403 : 401,
      );
    }
  }
  role = 'admin';
  expect(
    (await request(`/campaign/${id}`, 'PUT', { ...input, posts: [] })).status,
  ).toBe(400);
  expect((await request(`/campaign/${id}`, 'PUT', input)).status).toBe(200);
  expect(
    (await request(`/campaign/${id}/test`, 'POST', { attemptId: id })).status,
  ).toBe(200);
  expect(calls[0].payload.to).toEqual(['admin@example.test']);
});
