import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

import { CategoriesDtoSchema } from './categories.dto'
import { MediaDtoSchema } from './media.dto'
import { TagsDtoSchema } from './tags.dto'

export const PostDtoSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(60),
  slug: z.string().min(1).max(30),
  description: z.string().min(1),
  category: CategoriesDtoSchema,
  mainImage: MediaDtoSchema,
  body: z.any(),
  readingTime: z.number(),
  status: z.number(),
  mood: z.enum(['happy', 'sad', 'neutral']),
  createdAt: z.date().or(z.string()),
  publishedAt: z.date().or(z.string()),
  tags: z.array(TagsDtoSchema).optional(),
})

export type PostDto = z.infer<typeof PostDtoSchema>
export const PostHashids = Hashids('posts')
