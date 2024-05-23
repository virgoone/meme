'use server'

import { unstable_noStore as noStore, revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'
import { isNil, omitBy } from 'lodash'

import { db } from '~/db'
import { CategoriesHashids } from '~/db/dto/categories.dto'
import { MediaHashids } from '~/db/dto/media.dto'
import { PostHashids } from '~/db/dto/post.dto'
import { TagsHashids } from '~/db/dto/tags.dto'
import { post, postTags } from '~/db/schema'
import { getErrorMessage } from '~/lib/handle-error'

import {
  PublishedStatus,
  updateSchema,
  type CreateSchema,
  type UpdateSchema,
} from './validations'

const validateAndOmitEmpty = (input) => {
  // 使用 zod 验证输入数据
  const validatedInput = updateSchema.safeParse(input)

  if (!validatedInput.success) {
    // 如果验证失败，抛出错误或返回一个错误信息
    throw new Error('Validation failed')
  }

  // 从验证通过的数据中忽略所有 undefined 或 null 的属性
  const omittedInput = omitBy(validatedInput.data, isNil)

  return omittedInput
}
export async function createAction(input: CreateSchema) {
  noStore()
  try {
    const {
      title,
      slug,
      description,
      mainImage,
      body,
      readingTime,
      status,
      mood,
      tags,
      category,
    } = input
    const [mainImageId] = MediaHashids.decode(mainImage)
    let publishedAt = null
    if (status === PublishedStatus.Published) {
      publishedAt = new Date()
    }
    let [categoryId] = CategoriesHashids.decode(category)
    await db.transaction(async (tx) => {
      const [newPost] = await tx
        .insert(post)
        .values({
          title,
          slug,
          description,
          mainImage: mainImageId as number,
          body,
          readingTime,
          status,
          mood,
          publishedAt,
          catId: categoryId as number,
        })
        .returning({
          id: post.id,
        })
      const newPostTags = tags.map((tag) => {
        const [tagId] = TagsHashids.decode(tag)
        return {
          postId: newPost.id,
          tagId: tagId as number,
        }
      })
      if (newPostTags?.length > 0) {
        await tx.insert(postTags).values(newPostTags)
      }
    })

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
    const [id] = PostHashids.decode(input.id)
    const validInput = validateAndOmitEmpty(input)
    if (validInput?.category) {
      let [categoryId] = CategoriesHashids.decode(validInput.category)
      validInput.catId = categoryId as number
      delete validInput.category
    }
    if (validInput?.mainImage) {
      const [mainImageId] = MediaHashids.decode(validInput?.mainImage)
      validInput.mainImage = mainImageId as number
    }
    await db.transaction(async (tx) => {
      const { tags = [], status, ...rest } = validInput
      let publishedAt = null
      if (status === PublishedStatus.Published) {
        publishedAt = new Date()
      }
      await tx
        .update(post)
        .set({
          ...rest,
          publishedAt,
        })
        .where(eq(post.id, id as number))
      if (tags.length > 0) {
        // 删除所有 tag 和 post 关联
        await tx.delete(postTags).where(eq(post.id, id as number))
        const newPostTags = tags.map((tag) => {
          const [tagId] = TagsHashids.decode(tag)
          return {
            postId: id as number,
            tagId: tagId as number,
          }
        })
        if (newPostTags?.length > 0) {
          // 重新插入关联
          await tx.insert(postTags).values(newPostTags)
        }
      }
    })

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
    const [id] = PostHashids.decode(input.id)
    await db.transaction(async (tx) => {
      // 删除所有关联 tag
      await tx.delete(postTags).where(eq(postTags.postId, id as number))
      await tx.delete(post).where(eq(post.id, id as number))
    })

    revalidatePath('/')
  } catch (err) {
    return {
      data: null,
      error: getErrorMessage(err),
    }
  }
}
