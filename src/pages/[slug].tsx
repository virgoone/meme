import fs from 'fs'
import ErrorPage from 'next/error'
import { useRouter } from 'next/router'
import { join } from 'path'
import matter from 'gray-matter'

import Layout from '../layouts/mdx'
import { getPostFileSource, postFilePaths, POSTS_PATH } from '../utils'

type PostType = {
  slug: string
  title: string
  date: string
  coverImage: string
  author: any
  excerpt: string
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
  return <Layout source={post.source} frontMatter={post} />
}

export default Post

export async function getStaticProps({ params }: Params) {
  const postFilePath = join(POSTS_PATH, `${params.slug}.mdx`)
  const postFileMDPath = join(POSTS_PATH, `${params.slug}.md`)
  const filePath = fs.statSync(postFileMDPath) ? postFileMDPath : postFilePath
  const source = fs.readFileSync(filePath)

  const { content, data } = matter(source)

  data.date = new Date(data.date).toISOString()

  const mdxSource = await getPostFileSource(content, data)

  return {
    props: {
      post: {
        ...data,
        slug: params.slug,
        source: mdxSource,
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
