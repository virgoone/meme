import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { useRouterState } from '@tanstack/react-router';
import { BlogPostCardSkeleton } from './post-card';
import { BlogPageHeader } from './blog-page-header';

export function BlogPostPageSkeleton() {
  return (
    <div className='legacy-article-skeleton' role='status' aria-label='文章加载中'>
      <aside className='legacy-article-skeleton__toc' aria-hidden='true'>
        <span /><span /><span /><span />
      </aside>
      <div className='legacy-article-skeleton__main' aria-hidden='true'>
        <span className='legacy-article-skeleton__cover' />
        <div className='legacy-article-skeleton__meta'><span /><span /></div>
        <span className='legacy-article-skeleton__title' />
        <span className='legacy-article-skeleton__title short' />
        <span className='legacy-article-skeleton__lead' />
        <div className='legacy-article-skeleton__body'>
          {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
        </div>
      </div>
      <aside className='legacy-article-skeleton__reactions' aria-hidden='true'>
        <span /><span /><span /><span />
      </aside>
    </div>
  );
}

export function AdminContentSkeleton() {
  return (
    <section className='admin-page admin-page-loading' role='status' aria-label='后台内容加载中'>
      <div className='admin-skeleton-header'><span /><span /></div>
      <div className='admin-stat-grid'>
        {Array.from({ length: 3 }, (_, index) => (
          <div className='admin-stat-card admin-stat-card--skeleton' key={index}><span /><strong /></div>
        ))}
      </div>
      <div className='admin-skeleton-panel'>
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );
}

export function PageSkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/admin')) return <AdminContentSkeleton />;
  if (pathname === '/blog') return (
    <section className='legacy-container legacy-blog-page'>
      <BlogPageHeader />
      <div className='legacy-blog-grid' role='status' aria-label='文章列表加载中'>
        {Array.from({ length: 6 }, (_, index) => <BlogPostCardSkeleton key={index} />)}
      </div>
    </section>
  );
  if (/^\/blog\/.+/.test(pathname) || /^\/(?!blog$|projects$|guestbook$|login$|register$)[^/]+$/.test(pathname)) {
    return <article className='article-page'><BlogPostPageSkeleton /></article>;
  }
  return (
    <section className='content-page route-skeleton' role='status' aria-label='页面加载中'>
      <div className='route-skeleton__heading' aria-hidden='true'>
        <Skeleton className='h-10 w-64 max-w-full' />
        <Skeleton className='h-4 w-96 max-w-full' />
      </div>
      {pathname === '/' || pathname === '/blog' ? (
        <div className='legacy-blog-grid'>
          {Array.from({ length: 6 }, (_, index) => <BlogPostCardSkeleton key={index} />)}
        </div>
      ) : (
        <div className='route-skeleton__rows' aria-hidden='true'>
          {Array.from({ length: 4 }, (_, index) => (
            <div className='route-skeleton__row' key={index}>
              <Skeleton className='size-10 shrink-0 rounded-full' />
              <div><Skeleton className='h-4 w-48 max-w-full' /><Skeleton className='h-4 w-full' /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function RoutePendingSkeleton() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return <PageSkeleton pathname={pathname} />;
}
