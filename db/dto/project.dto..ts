import { z } from 'zod'

import { Hashids } from '~/lib/hashid'

export const ProjectDtoSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(600),
  url: z.string().url(),
  icon: z.string(),
  createdAt: z.date().or(z.string()),
})

export type ProjectDto = z.infer<typeof ProjectDtoSchema>
export const ProjectHashids = Hashids('project')
