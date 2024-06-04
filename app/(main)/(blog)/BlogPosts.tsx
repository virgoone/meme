import { kvKeys } from '~/config/kv'
import { getBySearch } from '~/db/queries/post'
import { env } from '~/env.mjs'
import { redis } from '~/lib/redis'

import { BlogPostCard } from './BlogPostCard'

export async function BlogPosts({ limit = 5 }) {
  const { data: posts } = await getBySearch({ pageSize: limit })
  const postIdKeys = posts.map(({ id }) => kvKeys.postViews(id))

  let views: number[] = []
  if (env.VERCEL_ENV === 'development') {
    views = posts.map(() => Math.floor(Math.random() * 1000))
  } else {
    if (postIdKeys.length > 0) {
      views = await redis.mget<number[]>(...postIdKeys)
    }
  }

  return (
    <>
      {posts.map((post, idx) => (
        <BlogPostCard post={post} views={views[idx] ?? 0} key={post.id} />
      ))}
    </>
  )
}
