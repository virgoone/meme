import Head from 'next/head'
import PageLayout from '../layouts/page'
import { getAllPosts, PostType } from '../utils/get-posts'
import PostItem from '../components/post-item'
import { useMemo } from 'react'

export const getStaticProps = async () => {
  const posts = getAllPosts([
    'title',
    'date',
    'slug',
    'tags',
    'description',
    'categories',
    'cover_index',
    'keywords',
    'subtitle',
    'content',
    'tags',
  ])

  return {
    props: { posts },
  }
}
export default function Home(props: { posts: PostType[] }) {
  const { posts } = props
  const filterPosts = useMemo(
    () =>
      posts.slice(0, 10).filter((post) => post.description && post.keywords),
    [posts],
  )
  return (
    <PageLayout
      frontMatter={{
        title: '首页',
        description: filterPosts.map((post) => post.description).join(', '),
        keywords: filterPosts.map((post) => post.keywords).join(', '),
      }}
    >
      {posts.map((post) => {
        return <PostItem key={post.slug} post={post} />
      })}
    </PageLayout>
  )
}
