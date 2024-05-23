import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

export const PostDtoSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(60),
  slug: z.string().min(1).max(30),
  description: z.string().min(1),
  category: z.object({
    title: z.string(),
    icon: z.string().url(),
  }),
  mainImage: z.string(),
  body: z.any(),
  readingTime: z.number(),
  status: z.number(),
  mood: z.enum(['happy', 'sad', 'neutral']),
  createdAt: z.date().or(z.string()),
  tags: z.array(z.string()).optional(),
})

export type PostDto = z.infer<typeof PostDtoSchema>
export const PostHashids = Hashids('posts')
