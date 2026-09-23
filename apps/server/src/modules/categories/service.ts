import { categories, createD1Database } from '@meme/db';
import { desc, like } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type ListTaxonomyOptions = {
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

export async function listCategories(
  env: WorkerEnv,
  options: ListTaxonomyOptions,
) {
  const db = createD1Database(env.DB);
  const page = clampPage(options.page);
  const pageSize = clampPageSize(options.pageSize);
  const title = options.title?.trim();

  return db
    .select()
    .from(categories)
    .where(title ? like(categories.title, `%${title}%`) : undefined)
    .orderBy(desc(categories.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
