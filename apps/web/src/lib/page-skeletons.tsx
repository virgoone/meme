import { useRouterState } from '@tanstack/react-router';

import { PostListSkeleton } from './post-list';

export function BlogPostPageSkeleton() {
  return (
    <div className='legacy-article-skeleton' role='status' aria-label='文章加载中'>
      <aside className='legacy-article-skeleton__toc' aria-hidden='true'>
        <span /><span /><span /><span />
      </aside>
      <div className='legacy-article-skeleton__main' aria-hidden='true'>
        <div className='legacy-article-skeleton__meta'><span /><span /></div>
        <span className='legacy-article-skeleton__title' />
        <span className='legacy-article-skeleton__title short' />
        <span className='legacy-article-skeleton__lead' />
        <span className='legacy-article-skeleton__cover' />
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
  if (/^\/blog\/.+/.test(pathname) || /^\/(?!blog$|projects$|guestbook$|login$|register$|about$|contact$|privacy$|terms$)[^/]+$/.test(pathname)) {
    return <article className='article-page'><BlogPostPageSkeleton /></article>;
  }
  return (
    <section className='site-measure' role='status' aria-label='页面加载中'>
      <div aria-hidden='true'>
        <span className='skeleton-line skeleton-line--meta' />
        <span className='skeleton-line skeleton-line--title' style={{ height: 28, marginTop: 12 }} />
        <span className='skeleton-line skeleton-line--text' />
      </div>
      <div className='site-section'>
        <PostListSkeleton count={pathname === '/' || pathname === '/blog' ? 6 : 4} />
      </div>
    </section>
  );
}

export function RoutePendingSkeleton() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return <PageSkeleton pathname={pathname} />;
}
