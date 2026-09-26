import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Send } from 'lucide-react';

import { DataTableSkeleton } from '@bunship-ai/data-table';
import { Badge } from '@bunship-ai/ui/components/badge';
import { Button } from '@bunship-ai/ui/components/button';

import { useAdminNewsletters, type Newsletter } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, type DataTableColumn, ErrorText, SimpleDataTable, StatCard, StatGrid } from '../lib/admin-ui';
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

const columns: DataTableColumn<Newsletter>[] = [
  {
    id: 'subject',
    header: '邮件主题',
    size: 420,
    cell: (row) => <span className='block truncate font-medium text-sm'>{row.subject ?? `邮件 #${row.id}`}</span>,
  },
  {
    id: 'status',
    header: '状态',
    size: 130,
    cell: (row) =>
      row.sentAt ? <Badge>已发送</Badge>
        : row.campaignStatus === 'sending' ? <Badge variant='secondary'>发送中</Badge>
          : <Badge variant='outline'>草稿</Badge>,
  },
  {
    id: 'created',
    header: '创建时间',
    size: 160,
    cell: (row) => <span className='text-muted-foreground text-sm'>{formatDate(row.createdAt)}</span>,
  },
  {
    id: 'action',
    header: '',
    size: 130,
    cell: (row) => (
      <div className='flex justify-end'>
        {row.campaignId ? (
          <Button asChild variant='outline' size='sm'>
            <Link to='/admin/newsletters/new' search={{ campaign: row.campaignId }}>
              {row.sentAt ? '查看' : row.campaignStatus === 'sending' ? '继续发送' : '继续编辑'}
            </Link>
          </Button>
        ) : row.sentAt ? (
          <Button asChild variant='ghost' size='sm'>
            <Link to='/newsletters/$id' params={{ id: String(row.id) }}>查看</Link>
          </Button>
        ) : (
          <span className='text-muted-foreground text-xs'>历史草稿</span>
        )}
      </div>
    ),
  },
];

function AdminNewslettersPage({ newsletters }: { newsletters: ReturnType<typeof useAdminNewsletters> }) {
  return (
    <AdminPage>
      <AdminPageHeader
        title='邮件群发'
        description='草稿、发送进度与历史邮件。'
        action={
          <Button asChild>
            <Link to='/admin/newsletters/new'><Send aria-hidden='true' />发送最近更新</Link>
          </Button>
        }
      />

      {newsletters.isPending ? (
        <DataTableSkeleton columnCount={3} rowCount={8} />
      ) : newsletters.isError ? (
        <ErrorText error={newsletters.error} />
      ) : newsletters.data ? (
        <>
          <StatGrid>
            <StatCard title='今日发送' value={countTodaySent(newsletters.data)} />
            <StatCard title='本月发送' value={countThisMonthSent(newsletters.data)} />
            <StatCard title='全部邮件' value={newsletters.data.length} />
          </StatGrid>
          <SimpleDataTable data={newsletters.data} getRowId={(row) => String(row.id)} columns={columns} />
        </>
      ) : null}
    </AdminPage>
  );
}

function countTodaySent(rows: Newsletter[]) {
  const target = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => row.sentAt?.slice(0, 10) === target).length;
}

function countThisMonthSent(rows: Newsletter[]) {
  const target = new Date().toISOString().slice(0, 7);
  return rows.filter((row) => row.sentAt?.slice(0, 7) === target).length;
}
