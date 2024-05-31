'use server'

import { unstable_noStore as noStore, revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'

import { db } from '~/db'
import { ProjectHashids } from '~/db/dto/project.dto'
import { postTags, project } from '~/db/schema'
import { getErrorMessage } from '~/lib/handle-error'

import type { CreateSchema, UpdateSchema } from './validations'

export async function createAction(input: CreateSchema) {
  noStore()
  try {
    const { name, url, icon, description = '' } = input

    await Promise.all([
      await db
        .insert(project)
        .values({ name, url, icon, description })
        .returning({
          newId: project.id,
        }),
    ])

    revalidatePath('/')

    return {
      data: null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}

export async function updateAction(input: UpdateSchema & { id: string }) {
  noStore()
  try {
    const [id] = ProjectHashids.decode(input.id)
    await db
      .update(project)
      .set({
        name: input.name,
        url: input.url,
        icon: input.icon,
        description: input.description,
      })
      .where(eq(project.id, id as number))

    revalidatePath('/')

    return {
      data: null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}

export async function deleteAction(input: { id: string }) {
  try {
    const [id] = ProjectHashids.decode(input.id)
    await db.delete(project).where(eq(project.id, id as number))

    revalidatePath('/')
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}
