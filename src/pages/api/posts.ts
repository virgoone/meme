// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAllPosts, PostType } from '../../utils/posts'

type Data = {
  posts: PostType[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  const { limit, fields = 'title,date,description' } = req.query
  const limitCount = limit ? parseInt(limit?.toString()) : 5
  const posts = await getAllPosts(fields.toString().split(','))
  res.status(200).json({
    posts: (limitCount ? posts.splice(0, limitCount) : posts) as PostType[],
  })
}
