import { desc } from 'drizzle-orm'

import { db } from '~/db'
import { ProjectHashids, type ProjectDto } from '~/db/dto/project.dto'
import { project } from '~/db/schema'

export async function fetchProjects({ limit = 200 }: { limit?: number } = {}) {
  const data = await db
    .select({
      id: project.id,
      name: project.name,
      icon: project.icon,
      url: project.url,
      description: project.description,
      createdAt: project.createdAt,
    })
    .from(project)
    .orderBy(desc(project.createdAt))
    .limit(limit)

  return data.map(
    ({ id, ...rest }) =>
      ({
        ...rest,
        id: ProjectHashids.encode(id),
      }) as ProjectDto,
  )
}
