import { blogArchiveHead } from '../lib/seo';
import { loadPublicQuery } from '../lib/route-query';
import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router';
import { normalizePage } from '@meme/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { blogPostsQueryOptions, useBlogPosts } from '../lib/admin-queries';
import { BlogPostCard, BlogPostCardSkeleton } from '../lib/post-card';
import { BlogPageHeader } from '../lib/blog-page-header';
import { Fragment } from 'react';
import { AdBanner } from '../lib/adsense';

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
  const pathname = useRouterState({ select: (s) => s.matches.at(-1)?.routeId });
  if (pathname !== '/blog') return <Outlet />;
  return <BlogPage />;
}

function BlogPage() {
  const { page = 1 } = Route.useSearch();
  const posts = useBlogPosts(page);
  const data = posts.data;

  return (
    <section className='legacy-container legacy-blog-page'>
      <BlogPageHeader />
      {data && <p className='blog-archive-count'>共 {data.total} 篇文章<span aria-hidden='true'> · </span>第 {data.page} / {data.totalPages} 页</p>}
      {posts.isPending && (
        <div className='legacy-blog-grid' role='status' aria-label='文章列表加载中'>
          {Array.from({ length: 6 }).map((_, i) => (<BlogPostCardSkeleton key={i} />))}
        </div>
      )}
      {posts.isError && <p className='state-text state-text--error'>{posts.error instanceof Error ? posts.error.message : String(posts.error)}</p>}
      {data && data.items.length === 0 && <p className='state-text'>还没有发布文章。</p>}
      {data && data.items.length > 0 && (
        <>
          <div className='legacy-blog-grid'>{data.items.map((p, index) => (
            <Fragment key={p.id}>
              <BlogPostCard post={p} archivePage={data.page} />
              {index === Math.min(4, data.items.length - 1) && <AdBanner placement='blog' instanceKey={String(data.page)} />}
            </Fragment>
          ))}</div>
          <BlogPagination page={data.page} totalPages={data.totalPages} />
        </>
      )}
    </section>
  );
}

function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages < 2) return null;
  const pages = totalPages <= 7 ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : [...new Set([1, page - 1, page, page + 1, totalPages])].filter(number => number >= 1 && number <= totalPages).sort((a, b) => a - b);
  const search = (number: number) => ({ page: number === 1 ? undefined : number });
  return <nav className='blog-pagination' aria-label='文章分页'>
    {page > 1 ? <Link to='/blog' activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }} search={search(page - 1)} rel='prev' className='blog-pagination-step'><ChevronLeft size={16} />上一页</Link> : <span className='blog-pagination-step' aria-disabled='true'><ChevronLeft size={16} />上一页</span>}
    <div className='blog-pagination-pages'>
      {pages.map((number, index) => <span className='blog-pagination-slot' key={number}>
        {index > 0 && number - pages[index - 1]! > 1 && <span className='blog-pagination-gap' aria-hidden='true'>…</span>}
        {number === page ? <span className='blog-pagination-number' aria-current='page'><span className='sr-only'>第 </span>{number}<span className='sr-only'> 页，当前页</span></span> : <Link to='/blog' activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }} search={search(number)} className='blog-pagination-number' aria-label={`第 ${number} 页`}>{number}</Link>}
      </span>)}
    </div>
    <span className='blog-pagination-mobile'><span className='sr-only'>第 </span>{page}<span aria-hidden='true'> / </span><span className='sr-only'> 页，共 </span>{totalPages}<span className='sr-only'> 页</span></span>
    {page < totalPages ? <Link to='/blog' activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }} search={search(page + 1)} rel='next' className='blog-pagination-step'>下一页<ChevronRight size={16} /></Link> : <span className='blog-pagination-step' aria-disabled='true'>下一页<ChevronRight size={16} /></span>}
  </nav>;
}
