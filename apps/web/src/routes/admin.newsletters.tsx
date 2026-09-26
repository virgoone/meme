import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import { useAdminNewsletters, type Newsletter } from '../lib/admin-queries';
import { AdminPageHeader, SimpleDataTable, StatCard } from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/newsletters')({
  component: AdminNewslettersRoute,
});

function AdminNewslettersRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const newsletters = useAdminNewsletters();

  if (pathname !== '/admin/newsletters') {
    return <Outlet />;
  }

  return <AdminNewslettersPage newsletters={newsletters} />;
}

function AdminNewslettersPage({
  newsletters,
}: {
  newsletters: ReturnType<typeof useAdminNewsletters>;
}) {
  return (
    <section className='admin-page'>
      <AdminPageHeader
        title='邮件记录'
        description='保存的草稿、发送进度与历史邮件。'
        action={
          <Link to='/admin/newsletters/new' className='admin-button'>
            发送最近更新
          </Link>
        }
      />

      {newsletters.isPending ? (
        <DataTableSkeleton columnCount={3} rowCount={10} />
      ) : newsletters.isError ? (
        <p className='admin-error'>
          {newsletters.error instanceof Error
            ? newsletters.error.message
            : String(newsletters.error)}
        </p>
      ) : newsletters.data ? (
        <>
          <div className='admin-stat-grid'>
            <StatCard
              title='今日发送'
              value={countTodaySent(newsletters.data)}
            />
            <StatCard
              title='本月发送'
              value={countThisMonth(newsletters.data)}
            />
            <StatCard title='全部邮件' value={newsletters.data.length} />
          </div>
          <SimpleDataTable
            data={newsletters.data}
            getRowId={(row) => String(row.id)}
            columns={[
              { id: 'subject', header: '邮件主题', cell: row => row.subject ?? `邮件 #${row.id}` },
              { id: 'status', header: '状态', cell: row => row.sentAt ? '已提交发送' : row.campaignStatus === 'sending' ? '待继续发送' : '草稿' },
              { id: 'created', header: '创建时间', cell: row => formatDate(row.createdAt) },
              { id: 'action', header: '操作', cell: row => row.campaignId ? <Link to='/admin/newsletters/new' search={{ campaign: row.campaignId }}>{row.sentAt ? '查看邮件' : row.campaignStatus === 'sending' ? '继续发送' : '继续编辑'}</Link> : row.sentAt ? <Link to='/newsletters/$id' params={{ id: String(row.id) }}>查看邮件</Link> : '历史草稿' },
            ]}
          />
        </>
      ) : null}
    </section>
  );
}

function countTodaySent(rows: Newsletter[]) {
  const target = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => row.sentAt?.slice(0, 10) === target).length;
}

function countThisMonth(rows: Newsletter[]) {
  const target = new Date().toISOString().slice(0, 7);
  return rows.filter((row) => row.sentAt?.slice(0, 7) === target).length;
}
