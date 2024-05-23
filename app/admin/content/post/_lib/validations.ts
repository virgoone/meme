import * as z from 'zod'

export const searchParamsSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  sort: z.string().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  from: z.string().optional(),
  status: z.number().optional(),
  to: z.string().optional(),
  operator: z.enum(['and', 'or']).optional(),
})
export enum PublishedStatus {
  Draft = 0,
  Published = 1,
  Offline = 2,
}

export enum MoodStatus {
  happy = 'happy',
  sad = 'sad',
  neutral = 'neutral',
}

export const PublishStatusOption = {
  [PublishedStatus.Draft]: 'Draft',
  [PublishedStatus.Published]: 'Published',
  [PublishedStatus.Offline]: 'Offline',
}

export const MoodStatusOption = {
  [MoodStatus.happy]: 'happy',
  [MoodStatus.sad]: 'sad',
  [MoodStatus.neutral]: 'neutral',
}
export const getSchema = searchParamsSchema

export type GetSchema = z.infer<typeof getSchema>

export const createSchema = z.object({
  title: z.string().min(2, {
    message: 'title must be at least 2 characters.',
  }),
  slug: z.string().min(1).max(30),
  description: z.string().min(1),
  mainImage: z.any(),
  body: z.any(),
  readingTime: z.number(),
  status: z.number(),
  mood: z.enum(['happy', 'sad', 'neutral']),
  tags: z.array(z.string()).optional(),
  category: z.string(),
})

export type CreateSchema = z.infer<typeof createSchema>

export const updateSchema = z.object({
  title: z.string().optional(),
  slug: z.string().min(1).max(30).optional(),
  description: z.string().min(1).optional(),
  mainImage: z.any().optional(),
  body: z.any().optional(),
  readingTime: z.number().optional(),
  status: z.number().optional(),
  mood: z.enum(['happy', 'sad', 'neutral']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
})

export type UpdateSchema = z.infer<typeof updateSchema>
