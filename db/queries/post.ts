import 'server-only'

import { unstable_noStore as noStore } from 'next/cache'

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from 'drizzle-orm'
import * as z from 'zod'

import { db } from '~/db'
import { CategoriesDto, CategoriesHashids } from '~/db/dto/categories.dto'
import { MediaHashids } from '~/db/dto/media.dto'
import { PostHashids, type PostDto } from '~/db/dto/post.dto'
import { TagsDto, TagsHashids } from '~/db/dto/tags.dto'
import { categories, media, post, postTags, tags } from '~/db/schema'
import { filterColumn } from '~/lib/filter-column'
import type { DrizzleWhere } from '~/lib/types'

const searchParamsSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  sort: z.string().optional(),
  status: z.number(),
})

type GetSchema = z.infer<typeof searchParamsSchema>

export async function getBySearch(input: GetSchema) {
  noStore()
  const { page, pageSize, sort, status } = input

  try {
    // Offset to paginate the results
    const offset = (page - 1) * pageSize
    // Column and order to sort by
    // Spliting the sort string by "." to get the column and order
    // Example: "title.desc" => ["title", "desc"]
    const [column, order] = (sort?.split('.').filter(Boolean) ?? [
      'createdAt',
      'desc',
    ]) as [keyof PostDto | undefined, 'asc' | 'desc' | undefined]

    // Convert the date strings to Date objects
    const where: DrizzleWhere<PostDto> = and(
      !!status
        ? filterColumn({
            column: post.status,
            value: status + '',
            isSelectable: true,
          })
        : undefined,
    )

    // Transaction is used to ensure both queries are executed in a single transaction
    const { data, total } = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(post)
        .leftJoin(categories, eq(categories.id, post.catId))
        .leftJoin(postTags, eq(post.id, postTags.postId))
        .leftJoin(tags, eq(postTags.tagId, tags.id))
        .leftJoin(media, eq(post.mainImage, media.id))
        .limit(pageSize)
        .offset(offset)
        .where(where)
        .orderBy(
          column && column in post
            ? order === 'asc'
              ? asc(post[column])
              : desc(post[column])
            : desc(post.id),
        )
      // const category = await db
      //   .select()
      //   .from(categories)
      //   .where(
      //     inArray(
      //       categories.id,
      //       data.map((p) => p.catId),
      //     ),
      //   )
      const result = rows.reduce<
        Record<
          number,
          {
            id: string
            tags: TagsDto[]
            category: CategoriesDto
            [key: string]: any
          }
        >
      >((acc, row) => {
        const { post, tags, categories, media } = row
        if (!acc[post.id]) {
          acc[post.id] = {
            ...post,
            id: PostHashids.encode(row.post.id),
            tags: [],
            mainImage: media
              ? {
                  ...media,
                  id: MediaHashids.encode(media.id),
                }
              : {},
            category: {
              ...categories,
              id: CategoriesHashids.encode(categories.id),
            },
          }
        }
        if (tags) {
          acc[post.id].tags.push({
            ...tags,
            id: TagsHashids.encode(tags.id),
          })
        }
        return acc
      }, {})

      const data = Object.values(result)

      const total = await tx
        .select({
          count: count(),
        })
        .from(post)
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)

      return {
        data,
        total,
        pageSize,
        page,
      }
    })
    const pageCount = Math.ceil(total / pageSize)
    return { data, pageCount, total }
  } catch (err) {
    return { data: [], pageCount: 0, total: 0, pageSize, page }
  }
}
