import * as z from 'zod'

export const searchParamsSchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(10),
  sort: z.string().optional(),
  title: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  operator: z.enum(["and", "or"]).optional(),
})

export const getSchema = searchParamsSchema

export type GetSchema = z.infer<typeof getSchema>

export const createSchema = z.object({
  title: z.string().min(2, {
    message: 'title must be at least 2 characters.',
  }),
})

export type CreateSchema = z.infer<typeof createSchema>

export const updateSchema = z.object({
  title: z.string().optional(),
})

export type UpdateSchema = z.infer<typeof updateSchema>
