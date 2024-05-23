'use server'

import { unstable_noStore as noStore, revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'

import { db } from '~/db'
import { CategoriesHashids } from '~/db/dto/categories.dto'
import { categories } from '~/db/schema'
import { getErrorMessage } from '~/lib/handle-error'

import type { CreateSchema, UpdateSchema } from './validations'

export async function createAction(input: CreateSchema) {
  noStore()
  try {
    const { title, icon } = input

    await Promise.all([
      await db.insert(categories).values({ title, icon }).returning({
        newId: categories.id,
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
    const [id] = CategoriesHashids.decode(input.id)
    await db
      .update(categories)
      .set({
        title: input.title,
        icon: input.icon,
      })
      .where(eq(categories.id, id as number))

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
    const [id] = CategoriesHashids.decode(input.id)
    await db.delete(categories).where(eq(categories.id, id as number))

    revalidatePath('/')
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}
