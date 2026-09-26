import { privateHead } from '../lib/seo';
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@bunship-ai/ui/components/badge';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { DailyAreaChart, DailyBarChart, DailyLineChart, MonthlyBarChart, StatValue, TopPostsChart } from '../lib/admin-charts';
import { useAdminHealth, useAdminStats } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, SectionCard, StatCard, StatGrid } from '../lib/admin-ui';
import { AdminContentSkeleton } from '../lib/page-skeletons';

export const Route = createFileRoute('/admin')({
  head: privateHead,
  component: AdminRoute,
});

function AdminRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== '/admin') {
    return <Outlet />;
  }
  return <DashboardPage />;
}

const entries = [
  { label: '博客文章', description: '撰写、编辑与发布', to: '/admin/content/blog' },
  { label: '项目', description: '公开项目卡片', to: '/admin/content/project' },
  { label: '评论', description: '段落评论审阅', to: '/admin/comments' },
  { label: '订阅者', description: '订阅名单与状态', to: '/admin/subscribers' },
  { label: '邮件群发', description: '整理更新发给读者', to: '/admin/newsletters' },
  { label: '站点设置', description: '站点、邮件、存储与广告', to: '/admin/settings' },
] as const;

function DashboardPage() {
  const stats = useAdminStats();
  const health = useAdminHealth();

  if (stats.isPending) return <AdminContentSkeleton />;
  if (stats.isError) {
    return (
      <AdminPage>
        <AdminPageHeader title='仪表盘' description='站点流量与读者互动概览。' />
        <ErrorText error={stats.error} />
      </AdminPage>
    );
  }

  const data = stats.data;
  const trackedDays = data.views.daily.filter((point) => point.value > 0).length;

  return (
    <AdminPage>
      <AdminPageHeader
        title='仪表盘'
        description={`站点流量与读者互动概览。${data.views.trackedSince ? `按天统计自 ${data.views.trackedSince} 起。` : '按天统计从本次上线开始累积。'}`}
      />

      <StatGrid>
        <StatCard title='今日浏览' value={<StatValue value={data.views.today} />} />
        <StatCard title='近 7 天浏览' value={<StatValue value={data.views.week} />} />
        <StatCard title='本月浏览' value={<StatValue value={data.views.month} />} />
        <StatCard title='累计浏览' value={<StatValue value={data.views.total} />} hint='含迁移前的历史计数' />
      </StatGrid>

      <SectionCard title='近 30 天浏览量' description={trackedDays === 0 ? '还没有按天的数据，读者访问后这里会开始出现曲线。' : '每天的页面浏览次数，按北京时间计日。'}>
        <DailyAreaChart data={data.views.daily} label='浏览量' />
      </SectionCard>

      <div className='grid gap-4 xl:grid-cols-2'>
        <SectionCard title='文章浏览 Top 10' description='按累计浏览量排序，悬停查看完整标题。'>
          {data.topPosts.length > 0 ? (
            <>
              <TopPostsChart data={data.topPosts} label='浏览量' />
              <table className='mt-4 w-full text-xs'>
                <caption className='sr-only'>文章浏览量表</caption>
                <thead>
                  <tr className='text-muted-foreground'>
                    <th className='py-1 text-left font-medium'>文章</th>
                    <th className='py-1 text-right font-medium'>近 7 天</th>
                    <th className='py-1 text-right font-medium'>近 30 天</th>
                    <th className='py-1 text-right font-medium'>累计</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPosts.map((post) => (
                    <tr key={post.id} className='border-border border-t'>
                      <td className='max-w-0 truncate py-1.5 pr-3'><Link to='/$slug' params={{ slug: post.slug }} className='hover:underline' title={post.title}>{post.title}</Link></td>
                      <td className='py-1.5 text-right tabular-nums'>{post.last7}</td>
                      <td className='py-1.5 text-right tabular-nums'>{post.last30}</td>
                      <td className='py-1.5 text-right tabular-nums'>{post.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className='text-muted-foreground text-sm'>还没有已发布的文章。</p>
          )}
        </SectionCard>

        <div className='grid content-start gap-4'>
          <SectionCard
            title='订阅者'
            description={`有效订阅 ${data.subscribers.active} 人，本月新增 ${data.subscribers.month}，今日新增 ${data.subscribers.today}。`}
          >
            <DailyLineChart data={data.subscribers.daily} label='有效订阅' height={180} />
          </SectionCard>
          <SectionCard title='发布节奏' description={`近 12 个月每月发布的文章数，共 ${data.publishing.total} 篇。`}>
            <MonthlyBarChart data={data.publishing.monthly} label='发布' height={150} />
          </SectionCard>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        <SectionCard title='评论' description={`近 30 天每日评论数，本月 ${data.comments.month} 条，累计 ${data.comments.total} 条。`}>
          <DailyBarChart data={data.comments.daily} label='评论' />
        </SectionCard>
        <SectionCard title='留言' description={`近 30 天每日留言数，本月 ${data.guestbook.month} 条，累计 ${data.guestbook.total} 条。`}>
          <DailyBarChart data={data.guestbook.daily} label='留言' />
        </SectionCard>
      </div>

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
          {health.isPending ? (
            <div className='grid gap-2'><Skeleton className='h-4 w-1/2' /><Skeleton className='h-4 w-2/3' /></div>
          ) : health.isError ? (
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
