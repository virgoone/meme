import fs from 'fs'
import ErrorPage from 'next/error'
import { useRouter } from 'next/router'
import { join } from 'path'
import Layout from '../layouts/mdx'
import { postFilePaths, POSTS_PATH } from '../utils'
import { getPostBySlug } from '../utils/posts

type PostType = {
  slug: string
  title: string
  date: string
  coverImage: string
  description?: string
  author: any
  excerpt?: string
  ogImage: {
    url: string
  }
  content: string
  source?: any
}

type Params = {
  params: {
    slug: string
  }
}

type Props = {
  post: PostType
  morePosts: PostType[]
  preview?: boolean
}

const Post = (props: Props) => {
  const { post } = props
  const router = useRouter()
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  return <Layout source={post.content} frontMatter={post} />
}

export default Post

export async function getStaticProps({ params }: Params) {
  const filePath = `${params.slug}.md`
  const post = await getPostBySlug(filePath)

  return {
    props: {
      post: {
        ...post,
        slug: params.slug,
      },
    },
  }
}

export async function getStaticPaths() {
  const paths = postFilePaths
    // Remove file extensions for page paths
    .map((path) => path.replace(/\.mdx?$/, ''))
    // Map the path into the static paths object required by Next.js
    .map((slug) => ({ params: { slug } }))

  return {
    paths,
    fallback: false,
  }
}
