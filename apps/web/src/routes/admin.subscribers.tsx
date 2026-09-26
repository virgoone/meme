import { createFileRoute, Link } from '@tanstack/react-router';
import { Send } from 'lucide-react';

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
      <AdminPageHeader title='订阅' description='管理读者订阅，把最近的文章整理成一封邮件。' action={<Link to='/admin/newsletters/new' className='admin-button' style={{ gap: 8 }}><Send size={15} />发送最近更新</Link>} />

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
            columns={['邮箱', '订阅状态', '订阅时间']}
            rows={subscribers.data.map((subscriber) => [
              subscriber.email ?? `Subscriber #${subscriber.id}`,
              subscriber.unsubscribedAt ? '已退订' : subscriber.subscribedAt ? '已订阅' : '待确认',
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
  return rows.filter((row) => row.subscribedAt && !row.unsubscribedAt);
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
