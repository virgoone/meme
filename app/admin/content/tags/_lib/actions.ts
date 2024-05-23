'use server'

import { unstable_noStore as noStore, revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'

import { db } from '~/db'
import { TagsHashids } from '~/db/dto/tags.dto'
import { postTags, tags } from '~/db/schema'
import { getErrorMessage } from '~/lib/handle-error'

import type { CreateSchema, UpdateSchema } from './validations'

export async function createAction(input: CreateSchema) {
  noStore()
  try {
    const { title } = input

    await Promise.all([
      await db.insert(tags).values({ title }).returning({
        newId: tags.id,
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
    const [id] = TagsHashids.decode(input.id)
    await db
      .update(tags)
      .set({
        title: input.title,
      })
      .where(eq(tags.id, id as number))

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
    const [id] = TagsHashids.decode(input.id)
    await db.transaction(async (tx) => {
      // 删除所有关联 tag
      await tx.delete(postTags).where(eq(postTags.tagId, id as number))
      await tx.delete(tags).where(eq(tags.id, id as number))
    })

    revalidatePath('/')
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}
