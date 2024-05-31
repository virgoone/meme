import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

export const PhotosDtoSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  description: z.string(),
  createdAt: z.date().or(z.string()),
})

export type PhotosDto = z.infer<typeof PhotosDtoSchema>
export const PhotosHashids = Hashids('photos')
