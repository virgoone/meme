import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

export const CategoriesDtoSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(600),
  icon: z.string().url(),
  createdAt: z.date().or(z.string()),
})

export type CategoriesDto = z.infer<typeof CategoriesDtoSchema>
export const CategoriesHashids = Hashids('categories')
