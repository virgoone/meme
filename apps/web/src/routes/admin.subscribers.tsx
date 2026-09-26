import { createFileRoute, Link } from '@tanstack/react-router';
import { Send } from 'lucide-react';

import { DataTableSkeleton } from '@bunship-ai/data-table';
import { Badge } from '@bunship-ai/ui/components/badge';
import { Button } from '@bunship-ai/ui/components/button';

import { useAdminSubscribers, type Subscriber } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, type DataTableColumn, ErrorText, SimpleDataTable, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/subscribers')({
  component: AdminSubscribersPage,
});

const columns: DataTableColumn<Subscriber>[] = [
  {
    id: 'email',
    header: '邮箱',
    size: 360,
    cell: (subscriber) => <span className='block truncate text-sm'>{subscriber.email ?? `Subscriber #${subscriber.id}`}</span>,
  },
  {
    id: 'status',
    header: '状态',
    size: 120,
    cell: (subscriber) =>
      subscriber.unsubscribedAt ? <Badge variant='outline'>已退订</Badge>
        : subscriber.subscribedAt ? <Badge>已订阅</Badge>
          : <Badge variant='secondary'>待确认</Badge>,
  },
  {
    id: 'time',
    header: '时间',
    size: 160,
    cell: (subscriber) => <span className='text-muted-foreground text-sm'>{formatDate(subscriber.subscribedAt ?? subscriber.updatedAt)}</span>,
  },
];

function AdminSubscribersPage() {
  const subscribers = useAdminSubscribers();

  return (
    <AdminPage>
      <AdminPageHeader
        title='订阅者'
        description='读者的订阅名单；把最近的文章整理成一封邮件发给他们。'
        action={
          <Button asChild>
            <Link to='/admin/newsletters/new'><Send aria-hidden='true' />发送最近更新</Link>
          </Button>
        }
      />

      {subscribers.isPending ? (
        <DataTableSkeleton columnCount={3} rowCount={10} />
      ) : subscribers.isError ? (
        <ErrorText error={subscribers.error} />
      ) : subscribers.data ? (
        <>
          <StatGrid>
            <StatCard title='有效订阅' value={subscribedRows(subscribers.data).length} />
            <StatCard title='今日新增' value={countSubscribedToday(subscribers.data)} />
            <StatCard title='本月新增' value={countSubscribedThisMonth(subscribers.data)} />
            <StatCard title='待确认' value={subscribers.data.filter((row) => !row.subscribedAt && !row.unsubscribedAt).length} />
          </StatGrid>
          <SimpleDataTable columns={columns} data={subscribers.data} getRowId={(row) => String(row.id)} pageSize={20} />
        </>
      ) : null}
    </AdminPage>
  );
}

function subscribedRows(rows: Subscriber[]) {
  return rows.filter((row) => row.subscribedAt && !row.unsubscribedAt);
}

function countSubscribedToday(rows: Subscriber[]) {
  const target = new Date().toISOString().slice(0, 10);
  return subscribedRows(rows).filter((row) => row.subscribedAt?.slice(0, 10) === target).length;
}

function countSubscribedThisMonth(rows: Subscriber[]) {
  const target = new Date().toISOString().slice(0, 7);
  return subscribedRows(rows).filter((row) => row.subscribedAt?.slice(0, 7) === target).length;
}
