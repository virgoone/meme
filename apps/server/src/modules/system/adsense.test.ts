import { Database } from 'bun:sqlite';
import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { WorkerEnv } from '../../env';
import { getPublicConfig } from './public-config';
import { getAllSettings, upsertSettings } from '../settings/service';
import { handlePublicRoute } from '../../cloudflare/public-routes';

const databases: Database[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
function fixture(appEnv = 'production') {
  const db = new Database(':memory:');
  databases.push(db);
  db.exec(readFileSync(new URL('../../../../../packages/db/drizzle/0004_settings.sql', import.meta.url), 'utf8'));
  class Statement {
    values: any[] = [];
    constructor(readonly sql: string) {}
    bind(...values: any[]) { this.values = values; return this; }
    async raw() { return db.prepare(this.sql).values(...this.values); }
    async run() { return { success: true, meta: db.prepare(this.sql).run(...this.values) }; }
  }
  const env = { APP_ENV: appEnv, DB: { prepare: (sql: string) => new Statement(sql) } } as unknown as WorkerEnv;
  return { db, env };
}

describe('restored AdSense configuration', () => {
  test('retains publisher verification when display is disabled, and keeps previews ad-free', async () => {
    const { env } = fixture();
    const config = await getPublicConfig(env);
    expect(config.analyticsOrigin).toBeNull();
    expect(config.adsense.clientId).toBe('ca-pub-3801577709600181');
    expect(config.adsense.slotId).toBe('2131063994');
    expect(config.adsense.enabled).toBe(true);
    await upsertSettings(env, { ADSENSE_ENABLED: false });
    expect((await getPublicConfig(env)).adsense.enabled).toBe(false);
    for (const method of ['GET', 'HEAD']) {
      const response = await handlePublicRoute(new Request('https://blog.douni.one/ads.txt', { method }), env);
      expect(response?.status).toBe(200);
      expect(response?.headers.get('content-type')).toBe('text/plain; charset=utf-8');
      expect(await response?.text()).toBe(method === 'HEAD' ? '' : 'google.com, pub-3801577709600181, DIRECT, f08c47fec0942fa0\n');
    }
    expect((await getPublicConfig(fixture('development').env)).adsense.enabled).toBe(false);
  });

  test('persists individual placements and an explicit empty publisher without restoring defaults over them', async () => {
    const { env } = fixture();
    await upsertSettings(env, { ADSENSE_BLOG_ENABLED: false, ADSENSE_HOME_ENABLED: 'false' });
    const config = await getPublicConfig(env);
    expect(config.adsense.placements.blog).toBe(false);
    expect(config.adsense.placements.home).toBe(false);
    expect(config.adsense.placements.article).toBe(true);
    await upsertSettings(env, { ADSENSE_CLIENT_ID: '' });
    expect((await getPublicConfig(env)).adsense.clientId).toBeNull();
    expect((await getPublicConfig(env)).adsense.enabled).toBe(false);
    expect((await handlePublicRoute(new Request('https://blog.douni.one/ads.txt'), env))?.status).toBe(404);
  });

  test.each([
    { ADSENSE_CLIENT_ID: 'ca-pub-123<script>' },
    { ADSENSE_SLOT_ID: '123&callback=alert' },
    { ADSENSE_ENABLED: 'yes' },
  ])('rejects invalid input before writing any setting: %j', async input => {
    const { env } = fixture();
    await expect(upsertSettings(env, { SITE_TITLE: 'Must not save', ...input })).rejects.toMatchObject({ statusCode: 400 });
    expect((await getAllSettings(env)).SITE_TITLE).not.toBe('Must not save');
  });

  test('does not expose private settings with the public configuration', async () => {
    const { db, env } = fixture();
    db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run('RESEND_API_KEY', JSON.stringify('private-test-secret'));
    expect(JSON.stringify(await getPublicConfig(env))).not.toContain('private-test-secret');
  });
});
