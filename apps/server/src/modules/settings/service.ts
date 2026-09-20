import { ALL_SETTINGS_KEYS, SETTINGS_DEFAULTS } from '@meme/shared';
import {
  createD1Database,
  settings,
  type SettingInsert,
} from '@meme/db';
import { eq } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export async function getAllSettings(env: WorkerEnv): Promise<Record<string, unknown>> {
  const db = createD1Database(env.DB);

  const rows = await db.select().from(settings);

  const merged = { ...SETTINGS_DEFAULTS };
  for (const row of rows) {
    if (row.key != null) {
      merged[row.key] = row.value;
    }
  }

  return merged;
}

export async function upsertSettings(
  env: WorkerEnv,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const db = createD1Database(env.DB);
  const known = new Set<string>(ALL_SETTINGS_KEYS);

  const entries = Object.entries(input).filter(([key]) => known.has(key));
  if (entries.length === 0) return getAllSettings(env);

  const rows: SettingInsert[] = entries.map(([key, value]) => ({
    key,
    value,
  }));

  // D1 / drizzle insert … on conflict do update
  for (const row of rows) {
    await db
      .insert(settings)
      .values(row)
      .onConflictDoUpdate({ target: settings.key, set: { value: row.value } });
  }

  return getAllSettings(env);
}
