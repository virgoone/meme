import { desc, sql } from 'drizzle-orm'

import { db } from '~/db'
import { CategoriesHashids, type CategoriesDto } from '~/db/dto/categories.dto'
import { categories } from '~/db/schema'
import { PageProps } from '~/lib/types'

export async function getCategoriesByPage({
  page = 1,
  pageSize = 10,
}: PageProps) {
  const data = await db
    .select({
      id: categories.id,
      title: categories.title,
      icon: categories.icon,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .offset(page * pageSize)
    .orderBy(desc(categories.createdAt))
    .limit(pageSize)
  const { count: total } = await db
    .select({
      count: sql<number>`count(${categories.id})`,
    })
    .from(categories)
    .get()

  return {
    data: data.map(
      ({ id, ...rest }) =>
        ({
          ...rest,
          id: CategoriesHashids.encode(id),
        }) as CategoriesDto,
    ),
    total,
    page,
    pageSize,
  }
}
