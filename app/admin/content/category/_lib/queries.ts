import 'server-only'

import { unstable_noStore as noStore } from 'next/cache'

import { and, asc, count, desc, gte, ilike, lte, or } from 'drizzle-orm'

import { db } from '~/db'
import { CategoriesHashids, type CategoriesDto } from '~/db/dto/categories.dto'
import { categories } from '~/db/schema'
import { filterColumn } from '~/lib/filter-column'
import type { DrizzleWhere } from '~/lib/types'

import { type GetSchema } from './validations'

export async function getBySearch(input: GetSchema) {
  noStore()
  const { page, pageSize, sort, title, from, to, operator } = input

  try {
    // Offset to paginate the results
    const offset = (page - 1) * pageSize
    // Column and order to sort by
    // Spliting the sort string by "." to get the column and order
    // Example: "title.desc" => ["title", "desc"]
    const [column, order] = (sort?.split('.').filter(Boolean) ?? [
      'createdAt',
      'desc',
    ]) as [keyof CategoriesDto | undefined, 'asc' | 'desc' | undefined]

    // Convert the date strings to Date objects
    const fromDay = from ? from : undefined
    const toDay = to ? to : undefined
    const where: DrizzleWhere<CategoriesDto> =
      !operator || operator === 'and'
        ? and(
            // Filter tasks by title
            title
              ? filterColumn({
                  column: categories.title,
                  value: title,
                })
              : undefined,
            // Filter by createdAt
            fromDay && toDay
              ? and(
                  gte(categories.createdAt, fromDay),
                  lte(categories.createdAt, toDay),
                )
              : undefined,
          )
        : or(
            // Filter tasks by title
            title
              ? filterColumn({
                  column: categories.title,
                  value: title,
                })
              : undefined,
            // Filter by createdAt
            fromDay && toDay
              ? and(
                  gte(categories.createdAt, fromDay),
                  lte(categories.createdAt, toDay),
                )
              : undefined,
          )

    // Transaction is used to ensure both queries are executed in a single transaction
    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select()
        .from(categories)
        .limit(pageSize)
        .offset(offset)
        .where(where)
        .orderBy(
          column && column in categories
            ? order === 'asc'
              ? asc(categories[column])
              : desc(categories[column])
            : desc(categories.id),
        )

      const total = await tx
        .select({
          count: count(),
        })
        .from(categories)
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)

      return {
        data: data.map(
          ({ id, ...rest }) =>
            ({
              ...rest,
              id: CategoriesHashids.encode(id),
            }) as CategoriesDto,
        ),
        total,
      }
    })
    // console.log('where-->', data, total, where, filterColumn({
    //   column: categories.title,
    //   value: title,
    // }))
    const pageCount = Math.ceil(total / pageSize)
    return { data, pageCount, total }
  } catch (err) {
    return { data: [], pageCount: 0, total: 0 }
  }
}

// export async function getTaskCountByStatus() {
//   noStore()
//   try {
//     return await db
//       .select({
//         status: tasks.status,
//         count: count(),
//       })
//       .from(tasks)
//       .groupBy(tasks.status)
//       .execute()
//   } catch (err) {
//     return []
//   }
// }

// export async function getTaskCountByPriority() {
//   noStore()
//   try {
//     return await db
//       .select({
//         priority: tasks.priority,
//         count: count(),
//       })
//       .from(tasks)
//       .groupBy(tasks.priority)
//       .execute()
//   } catch (err) {
//     return []
//   }
// }
