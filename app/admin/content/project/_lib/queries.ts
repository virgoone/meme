import 'server-only'

import { unstable_noStore as noStore } from 'next/cache'

import { and, asc, count, desc, gte, ilike, lte, or } from 'drizzle-orm'

import { db } from '~/db'
import { ProjectHashids, type ProjectDto } from '~/db/dto/project.dto'
import { project } from '~/db/schema'
import { filterColumn } from '~/lib/filter-column'
import type { DrizzleWhere } from '~/lib/types'

import { type GetSchema } from './validations'

export async function getBySearch(input: GetSchema) {
  noStore()
  const { page, pageSize, sort, name, from, to, operator } = input

  try {
    // Offset to paginate the results
    const offset = (page - 1) * pageSize
    // Column and order to sort by
    // Spliting the sort string by "." to get the column and order
    // Example: "title.desc" => ["title", "desc"]
    const [column, order] = (sort?.split('.').filter(Boolean) ?? [
      'createdAt',
      'desc',
    ]) as [keyof ProjectDto | undefined, 'asc' | 'desc' | undefined]

    // Convert the date strings to Date objects
    const fromDay = from ? from : undefined
    const toDay = to ? to : undefined
    const where: DrizzleWhere<ProjectDto> =
      !operator || operator === 'and'
        ? and(
            // Filter tasks by title
            name
              ? filterColumn({
                  column: project.name,
                  value: name,
                })
              : undefined,
            // Filter by createdAt
            fromDay && toDay
              ? and(
                  gte(project.createdAt, fromDay),
                  lte(project.createdAt, toDay),
                )
              : undefined,
          )
        : or(
            // Filter tasks by title
            name
              ? filterColumn({
                  column: project.name,
                  value: name,
                })
              : undefined,
            // Filter by createdAt
            fromDay && toDay
              ? and(
                  gte(project.createdAt, fromDay),
                  lte(project.createdAt, toDay),
                )
              : undefined,
          )

    // Transaction is used to ensure both queries are executed in a single transaction
    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select()
        .from(project)
        .limit(pageSize)
        .offset(offset)
        .where(where)
        .orderBy(
          column && column in project
            ? order === 'asc'
              ? asc(project[column])
              : desc(project[column])
            : desc(project.id),
        )

      const total = await tx
        .select({
          count: count(),
        })
        .from(project)
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)

      return {
        data: data.map(
          ({ id, ...rest }) =>
            ({
              ...rest,
              id: ProjectHashids.encode(id),
            }) as ProjectDto,
        ),
        total,
      }
    })
    // console.log('where-->', data, total, where, filterColumn({
    //   column: project.title,
    //   value: title,
    // }))
    const pageCount = Math.ceil(total / pageSize)
    return { data, pageCount, total }
  } catch (err) {
    return { data: [], pageCount: 0, total: 0 }
  }
}
