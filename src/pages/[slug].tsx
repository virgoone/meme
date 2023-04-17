import ErrorPage from 'next/error'
import { useRouter } from 'next/router'
import Layout from '../components/layouts/mdx'
import { postFilePaths } from '../utils'
import { getPostBySlug, PostType } from '../utils/posts'

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
