import React from 'react'

import { desc, inArray, sql } from 'drizzle-orm'

import { db } from '~/db'
import { comments, post } from '~/db/schema'

import CommentCard from './_mods/card'

export default async function AdminCommentsPage() {
  const [commentsCount] = await db.all<{
    today_count: number
    this_week_count: number
    this_month_count: number
  }>(
    sql`SELECT 
  (SELECT COUNT(*) FROM comments WHERE created_at = CURRENT_DATE) AS today_count,
  (SELECT COUNT(*) FROM comments WHERE strftime('%Y', created_at) = strftime('%Y', 'now') AND strftime('%W', created_at) = strftime('%W', 'now')) AS this_week_count,
  (SELECT COUNT(*) FROM comments WHERE strftime('%Y', created_at) = strftime('%Y', 'now') AND strftime('%m', created_at) = strftime('%m', 'now')) AS this_month_count`,
  )

  const latestComments = await db
    .select()
    .from(comments)
    .orderBy(desc(comments.createdAt))
    .limit(15)
  // get unique post IDs from comments
  const postIds = [...new Set(latestComments.map((comment) => comment.postId))]
  const posts = await db
    .select()
    .from(post)
    .where(
      postIds?.length
        ? inArray(
            post.id,
            postIds.map((v) => Number(v)),
          )
        : undefined,
    )
  // define a map with key of post IDs to posts
  const postMap = new Map(posts.map((post) => [post.id, post]))

  return (
    <CommentCard
      commentsCount={commentsCount}
      postMap={postMap}
      dataSource={latestComments}
    />
  )
}
