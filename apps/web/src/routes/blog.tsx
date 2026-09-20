import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { useBlogPosts } from '../lib/admin-queries';
import { BlogPostCard, BlogPostCardSkeleton } from '../lib/post-card';

export const Route = createFileRoute('/blog')({ component: BlogRoute });

const description = '博客内容基本为日常一些技术整理和总结，也可能会有其他类型内容';

function BlogRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== '/blog') return <Outlet />;
  return <BlogPage />;
}

function BlogPage() {
  const posts = useBlogPosts();

  return (
    <section className='legacy-container legacy-blog-page'>
      <header className='legacy-blog-header'>
        <h1>欢迎光临我的博客</h1>
        <p>{description}</p>
        <p className='legacy-rss'><a href='/feed.xml'>RSS</a></p>
      </header>
      {posts.isLoading && (
        <div className='legacy-blog-grid'>
          {Array.from({ length: 6 }).map((_, i) => (<BlogPostCardSkeleton key={i} />))}
        </div>
      )}
      {posts.isError && <p className='state-text state-text--error'>{posts.error instanceof Error ? posts.error.message : String(posts.error)}</p>}
      {posts.data && posts.data.length === 0 && <p className='state-text'>还没有导入文章。</p>}
      {posts.data && posts.data.length > 0 && (
        <div className='legacy-blog-grid'>{posts.data.map((p) => (<BlogPostCard post={p} key={p.id} />))}</div>
      )}
    </section>
  );
}
