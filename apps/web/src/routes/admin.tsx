import { privateHead } from '../lib/seo';
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@bunship-ai/ui/components/badge';
import {
  useAdminComments,
  useAdminGuestbook,
  useAdminHealth,
  useAdminSubscribers,
} from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, SectionCard, StatCard, StatGrid } from '../lib/admin-ui';
import { AdminContentSkeleton } from '../lib/page-skeletons';

export const Route = createFileRoute('/admin')({
  head: privateHead,
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

  return <AdminPage_ health={health} comments={comments} subscribers={subscribers} guestbook={guestbook} />;
}

const entries = [
  { label: '博客文章', description: '撰写、编辑与发布', to: '/admin/content/blog' },
  { label: '项目', description: '公开项目卡片', to: '/admin/content/project' },
  { label: '评论', description: '段落评论审阅', to: '/admin/comments' },
  { label: '订阅者', description: '订阅名单与状态', to: '/admin/subscribers' },
  { label: '邮件群发', description: '整理更新发给读者', to: '/admin/newsletters' },
  { label: '站点设置', description: '站点、邮件、存储与广告', to: '/admin/settings' },
] as const;

function AdminPage_({
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
  if (health.isPending || comments.isPending || subscribers.isPending || guestbook.isPending) {
    return <AdminContentSkeleton />;
  }

  const activeSubscribers = subscribers.data ? subscribers.data.filter((s) => s.subscribedAt && !s.unsubscribedAt).length : '-';

  return (
    <AdminPage>
      <AdminPageHeader title='仪表盘' description='站点内容与读者互动概览。' />

      <StatGrid>
        <StatCard title='评论' value={comments.data ? comments.data.length : '-'} />
        <StatCard title='有效订阅' value={activeSubscribers} hint={subscribers.data ? `共 ${subscribers.data.length} 条记录` : undefined} />
        <StatCard title='留言' value={guestbook.data ? guestbook.data.length : '-'} />
        <StatCard title='运行环境' value={health.data?.appEnv ?? '-'} hint={health.data ? `${health.data.runtime} · ${health.data.database}` : undefined} />
      </StatGrid>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]'>
        <SectionCard title='内容入口' description='常用的管理页面。' bodyClassName='p-0'>
          <ul className='divide-y divide-border'>
            {entries.map((entry) => (
              <li key={entry.to}>
                <Link to={entry.to} className='group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/60'>
                  <span className='grid gap-0.5'>
                    <span className='font-medium text-sm'>{entry.label}</span>
                    <span className='text-muted-foreground text-xs'>{entry.description}</span>
                  </span>
                  <ArrowUpRight aria-hidden='true' className='size-4 text-muted-foreground transition-colors group-hover:text-foreground' />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title='服务状态' description='当前 Worker 运行时与绑定。'>
          {health.isError ? (
            <ErrorText error={health.error} />
          ) : health.data ? (
            <dl className='grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3'>
              {Object.entries(health.data).map(([key, value]) => (
                <div key={key} className='grid gap-1'>
                  <dt className='text-[11px] text-muted-foreground uppercase tracking-wider'>{key}</dt>
                  <dd className='font-medium text-sm'>
                    {typeof value === 'boolean' ? <Badge variant={value ? 'default' : 'destructive'}>{value ? 'ok' : 'down'}</Badge> : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </SectionCard>
      </div>
    </AdminPage>
  );
}
