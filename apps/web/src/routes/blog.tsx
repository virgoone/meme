import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { normalizePage } from '@meme/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

import { blogPostsQueryOptions, useBlogPosts } from '../lib/admin-queries';
import { AdBanner } from '../lib/adsense';
import { PostListSkeleton, PostRow } from '../lib/post-list';
import { loadPublicQuery } from '../lib/route-query';
import { blogArchiveHead } from '../lib/seo';

export const Route = createFileRoute('/blog')({
  validateSearch: (search: Record<string, unknown>): { page?: number } => ({ page: normalizePage(search.page) === 1 ? undefined : normalizePage(search.page) }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps, location }) => {
    const data = await loadPublicQuery(context.queryClient, blogPostsQueryOptions(deps.page));
    if (location.pathname === '/blog' && data.page !== deps.page) {
      throw redirect({ to: '/blog', search: { page: data.page === 1 ? undefined : data.page }, replace: true });
    }
    return data;
  },
  head: ({ loaderData }) => blogArchiveHead(loaderData?.page ?? 1),
  component: BlogRoute,
});

function BlogRoute() {
  const routeId = useRouterState({ select: (s) => s.matches.at(-1)?.routeId });
  if (routeId !== '/blog') return <Outlet />;
  return <BlogPage />;
}

function BlogPage() {
  const { page = 1 } = Route.useSearch();
  const posts = useBlogPosts(page);
  const data = posts.data;

  return (
    <section className='site-measure'>
      <header>
        <p className='site-kicker'>
          <span>博客{data ? ` · 共 ${data.total} 篇` : ''}</span>
          <a href='/feed.xml'>RSS</a>
        </p>
        <h1 className='site-title'>日常的技术整理与总结</h1>
        <p className='site-lead'>也可能会有其他类型的内容。</p>
      </header>

      <div className='site-section'>
        {posts.isPending && <PostListSkeleton count={8} />}
        {posts.isError && (
          <p className='site-empty site-empty--error'>{posts.error instanceof Error ? posts.error.message : String(posts.error)}</p>
        )}
        {data && data.items.length === 0 && (
          <p className='site-empty'>{page > 1 ? '这一页没有文章了。' : '还没有发布文章。'}</p>
        )}
        {data && data.items.length > 0 && (
          <ul className='site-rows'>
            {data.items.map((post, index) => (
              <Fragment key={post.id}>
                <PostRow post={post} archivePage={data.page} showDescription={false} />
                {index === Math.min(4, data.items.length - 1) && (
                  <li className='site-rows__ad'><AdBanner placement='blog' instanceKey={String(data.page)} /></li>
                )}
              </Fragment>
            ))}
          </ul>
        )}
      </div>

      {data ? <BlogPagination page={data.page} totalPages={data.totalPages} /> : null}
    </section>
  );
}

function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages < 2) return null;
  const pages = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [...new Set([1, page - 1, page, page + 1, totalPages])].filter((number) => number >= 1 && number <= totalPages).sort((a, b) => a - b);
  const search = (number: number) => ({ page: number === 1 ? undefined : number });
  const activeOptions = { exact: true, includeSearch: true, explicitUndefined: true } as const;

  return (
    <nav className='blog-pagination' aria-label='文章分页'>
      {page > 1 ? (
        <Link to='/blog' search={search(page - 1)} rel='prev' className='blog-pagination-step' activeOptions={activeOptions}>
          <ChevronLeft aria-hidden='true' />
          上一页
        </Link>
      ) : (
        <span className='blog-pagination-step is-disabled'>
          <ChevronLeft aria-hidden='true' />
          上一页
        </span>
      )}
      <div className='blog-pagination-pages'>
        {pages.map((number, index) => (
          <span className='blog-pagination-slot' key={number}>
            {index > 0 && number - (pages[index - 1] ?? number) > 1 && <span className='blog-pagination-gap' aria-hidden='true'>…</span>}
            {number === page ? (
              <Link to='/blog' search={search(number)} className='blog-pagination-number' aria-current='page' aria-label={`第 ${number} 页，当前页`}>
                {number}
              </Link>
            ) : (
              <Link to='/blog' search={search(number)} className='blog-pagination-number' aria-label={`第 ${number} 页`} activeOptions={activeOptions}>
                {number}
              </Link>
            )}
          </span>
        ))}
      </div>
      <span className='blog-pagination-mobile'>第 {page} / {totalPages} 页</span>
      {page < totalPages ? (
        <Link to='/blog' search={search(page + 1)} rel='next' className='blog-pagination-step' activeOptions={activeOptions}>
          下一页
          <ChevronRight aria-hidden='true' />
        </Link>
      ) : (
        <span className='blog-pagination-step is-disabled'>
          下一页
          <ChevronRight aria-hidden='true' />
        </span>
      )}
    </nav>
  );
}
