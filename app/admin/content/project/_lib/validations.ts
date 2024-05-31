import * as z from 'zod'

export const searchParamsSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  sort: z.string().optional(),
  name: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  operator: z.enum(['and', 'or']).optional(),
})

export const getSchema = searchParamsSchema

export type GetSchema = z.infer<typeof getSchema>

export const createSchema = z.object({
  name: z.string().min(2, {
    message: 'name must be at least 2 characters.',
  }),
  url: z.string().url(),
  icon: z.any(),
  description: z.string().nullish(),
})

export type CreateSchema = z.infer<typeof createSchema>

export const updateSchema = z.object({
  name: z.string().optional(),
  url: z.string().url().optional(),
  icon: z.any().optional(),
  description: z.string().nullish().optional(),
})

export type UpdateSchema = z.infer<typeof updateSchema>
