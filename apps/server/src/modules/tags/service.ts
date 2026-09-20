import { createD1Database, tags } from '@meme/db';
import { desc, like } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type ListTagsOptions = {
  page?: number;
  pageSize?: number;
  title?: string | null;
};

function clampPage(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 1;
  return Math.max(Math.trunc(value), 1);
}

function clampPageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 10;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

export async function listTags(env: WorkerEnv, options: ListTagsOptions) {
  const db = createD1Database(env.DB);
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const title = options.title?.trim();

  return db
    .select()
    .from(tags)
    .where(title ? like(tags.title, `%${title}%`) : undefined)
    .orderBy(desc(tags.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
