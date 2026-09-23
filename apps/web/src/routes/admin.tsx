import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';

import {
  useAdminComments,
  useAdminGuestbook,
  useAdminHealth,
  useAdminSubscribers,
} from '../lib/admin-queries';
import { AdminPageHeader, StatCard } from '../lib/admin-ui';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';

export const Route = createFileRoute('/admin')({
  component: AdminRoute,
});

function AdminRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const health = useAdminHealth();
  const comments = useAdminComments();
  const subscribers = useAdminSubscribers();
  const guestbook = useAdminGuestbook();

  if (pathname !== '/admin') {
    return <Outlet />;
  }

  return (
    <AdminPage
      health={health}
      comments={comments}
      subscribers={subscribers}
      guestbook={guestbook}
    />
  );
}

function AdminPage({
  health,
  comments,
  subscribers,
  guestbook,
}: {
  health: ReturnType<typeof useAdminHealth>;
  comments: ReturnType<typeof useAdminComments>;
  subscribers: ReturnType<typeof useAdminSubscribers>;
  guestbook: ReturnType<typeof useAdminGuestbook>;
}) {
  return (
    <section className='admin-page'>
      <AdminPageHeader title='仪表盘' description='站点内容和迁移数据概览。' />

      <div className='admin-stat-grid'>
        <StatCard title='总评论' value={comments.data ? comments.data.length : '-'} />
        <StatCard
          title='总订阅'
          value={
            subscribers.data
              ? subscribers.data.filter((s) => s.subscribedAt).length
              : '-'
          }
        />
        <StatCard title='总留言' value={guestbook.data ? guestbook.data.length : '-'} />
      </div>

      <div className='admin-grid'>
        <section className='admin-card'>
          <div className='admin-card__header'>
            <h2>服务状态</h2>
          </div>
          {health.isLoading ? (
            <Skeleton className='h-20 w-full' />
          ) : health.isError ? (
            <p className='admin-error'>
              {health.error instanceof Error ? health.error.message : String(health.error)}
            </p>
          ) : health.data ? (
            <dl className='admin-key-values'>
              {Object.entries(health.data).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className='admin-card'>
          <div className='admin-card__header'>
            <h2>内容入口</h2>
          </div>
          <div className='admin-link-list'>
            <Link to='/admin/content/blog'>博客内容</Link>
            <Link to='/admin/content/project'>项目列表</Link>
            <Link to='/admin/comments'>评论</Link>
            <Link to='/admin/subscribers'>订阅</Link>
            <Link to='/admin/newsletters'>Newsletters</Link>
            <Link to='/admin/settings'>站点设置</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
