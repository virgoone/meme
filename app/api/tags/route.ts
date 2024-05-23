import { NextResponse, type NextRequest } from 'next/server'

import { Ratelimit } from '@upstash/ratelimit'
import { desc, eq, like } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db'
import { TagsHashids, type TagsDto } from '~/db/dto/tags.dto'
import { tags } from '~/db/schema'
import { getErrorMessage } from '~/lib/handle-error'
import { redis } from '~/lib/redis'

function getKey(id: string) {
  return `tags:${id}`
}

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
  analytics: true,
})

export const getSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  title: z.string().optional(),
})

export type GetSchema = z.infer<typeof getSchema>

export async function GET(req: NextRequest) {
  try {
    const { success } = await ratelimit.limit(
      getKey(req.ip) + `_${req.ip ?? ''}`,
    )
    if (!success) {
      return new Response('Too Many Requests', {
        status: 429,
      })
    }
    const { searchParams } = new URL(req.url)

    const { page, pageSize, title } = getSchema.parse({
      title: searchParams.get('title'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
    })

    const offset = (page - 1) * pageSize

    const data = await db
      .select()
      .from(tags)
      .limit(pageSize)
      .offset(offset)
      .where(title ? like(tags.title, `%${title}%`) : undefined)
      .orderBy(desc(tags.id))

    return NextResponse.json(
      data.map(
        ({ id, ...rest }) =>
          ({
            ...rest,
            id: TagsHashids.encode(id),
          }) as TagsDto,
      ),
    )
  } catch (error) {
    const err = getErrorMessage(error)
    return NextResponse.json({ error: err }, { status: 400 })
  }
}
