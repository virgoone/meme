import Head from 'next/head'
import PageLayout from '../layouts/page'
import { getAllPosts, PostType } from '../utils/get-posts'
import PostItem from '../components/post-item'

export const getStaticProps = async () => {
  const posts = getAllPosts([
    'title',
    'date',
    'slug',
    'tags',
    'categories',
    'cover_index',
    'keywords',
    'subtitle',
    'content',
    'tags'
  ])

  return {
    props: { posts },
  }
}
export default function Home(props: { posts: PostType[] }) {
  const { posts } = props
  return (
    <PageLayout
      frontMatter={{
        title: '首页',
      }}
    >
      {posts.map((post) => {
        return <PostItem key={post.slug} post={post} />
      })}
    </PageLayout>
  )
}
