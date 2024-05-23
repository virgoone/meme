import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

export const TagsDtoSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(600),
  createdAt: z.date().or(z.string()),
})

export type TagsDto = z.infer<typeof TagsDtoSchema>
export const TagsHashids = Hashids('tags')
