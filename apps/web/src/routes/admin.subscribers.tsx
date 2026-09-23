import { createFileRoute } from '@tanstack/react-router';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import { useAdminSubscribers, type Subscriber } from '../lib/admin-queries';
import { AdminPageHeader, AdminTable, StatCard } from '../lib/admin-ui';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/subscribers')({
  component: AdminSubscribersPage,
});

function AdminSubscribersPage() {
  const subscribers = useAdminSubscribers();

  return (
    <section className='admin-page'>
      <AdminPageHeader title='订阅' description='邮件订阅用户和确认状态。' />

      {subscribers.isPending ? (
        <DataTableSkeleton columnCount={3} rowCount={10} />
      ) : subscribers.isError ? (
        <p className='admin-error'>
          {subscribers.error instanceof Error
            ? subscribers.error.message
            : String(subscribers.error)}
        </p>
      ) : subscribers.data ? (
        <>
          <div className='admin-stat-grid'>
            <StatCard
              title='总订阅数'
              value={subscribedRows(subscribers.data).length}
            />
            <StatCard
              title='今日订阅数'
              value={countSubscribedToday(subscribers.data)}
            />
            <StatCard
              title='本月订阅数'
              value={countSubscribedThisMonth(subscribers.data)}
            />
          </div>
          <AdminTable
            columns={['Email', 'Status', '订阅时间']}
            rows={subscribers.data.map((subscriber) => [
              subscriber.email ?? `Subscriber #${subscriber.id}`,
              subscriber.subscribedAt ? 'subscribed' : 'pending',
              subscriber.subscribedAt
                ? formatDate(subscriber.subscribedAt)
                : formatDate(subscriber.updatedAt),
            ])}
          />
        </>
      ) : null}
    </section>
  );
}

function subscribedRows(rows: Subscriber[]) {
  return rows.filter((row) => row.subscribedAt);
}

function countSubscribedToday(rows: Subscriber[]) {
  const target = new Date().toISOString().slice(0, 10);
  return subscribedRows(rows).filter(
    (row) => row.subscribedAt?.slice(0, 10) === target,
  ).length;
}

function countSubscribedThisMonth(rows: Subscriber[]) {
  const target = new Date().toISOString().slice(0, 7);
  return subscribedRows(rows).filter(
    (row) => row.subscribedAt?.slice(0, 7) === target,
  ).length;
}
