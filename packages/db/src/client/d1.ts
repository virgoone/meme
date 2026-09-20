import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';

import * as schema from '../schema';

export function createD1Database(db: D1Database) {
  return drizzle(db, { schema });
}

export type MemeD1Database = ReturnType<typeof createD1Database>;
