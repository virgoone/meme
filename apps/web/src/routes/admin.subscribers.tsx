import { createFileRoute, Link } from '@tanstack/react-router';
import { Mail, Send } from 'lucide-react';

import { type Subscriber, useAdminSubscribers } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { FilterChoice, FilterPopover, ListToolbar, matches, PageFooter, paginate, SearchBox, useUrlList } from '../lib/sluice/list-controls';
import { Badge, Button, EmptyState, TableCard } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/subscribers')({
  component: AdminSubscribersPage,
});

const SUBSCRIBER_KEYS = ['status'] as const;

type SubscriberStatus = 'subscribed' | 'pending' | 'unsubscribed';

function statusOf(subscriber: Subscriber): SubscriberStatus {
  return subscriber.unsubscribedAt ? 'unsubscribed' : subscriber.subscribedAt ? 'subscribed' : 'pending';
}

const columns: Column<Subscriber>[] = [
  {
    id: 'email',
    header: '邮箱',
    className: 'max-w-[220px] sm:max-w-md',
    cell: (subscriber) => <span className='block truncate font-medium text-title'>{subscriber.email ?? `Subscriber #${subscriber.id}`}</span>,
  },
  {
    id: 'status',
    header: '状态',
    cell: (subscriber) => {
      const status = statusOf(subscriber);
      return status === 'unsubscribed' ? <Badge tone='neutral'>已退订</Badge>
        : status === 'subscribed' ? <Badge tone='ok'>已订阅</Badge>
          : <Badge tone='warn'>待确认</Badge>;
    },
  },
  {
    id: 'time',
    header: '时间',
    hideOnMobile: true,
    cell: (subscriber) => <span className='whitespace-nowrap text-description type-sm'>{formatDate(subscriber.subscribedAt ?? subscriber.updatedAt)}</span>,
  },
];

function AdminSubscribersPage() {
  const subscribers = useAdminSubscribers();
  const { state, set } = useUrlList(SUBSCRIBER_KEYS);
  const all = subscribers.data ?? [];
  const counts: Record<SubscriberStatus, number> = { subscribed: 0, pending: 0, unsubscribed: 0 };
  for (const row of all) counts[statusOf(row)] += 1;
  const filtered = all.filter((row) => matches(state.q, row.email) && (!state.status || statusOf(row) === state.status));
  const slice = paginate(filtered, state.page, state.size);

  return (
    <AdminPage>
      <AdminPageHeader
        title='订阅者'
        description='读者的订阅名单；把最近的文章整理成一封邮件发给他们。'
        action={
          <Button variant='primary' asChild>
            <Link to='/admin/newsletters/new'><Send aria-hidden='true' />发送最近更新</Link>
          </Button>
        }
      />

      {subscribers.isPending ? (
        <TableCard>
          <TableSkeleton rows={6} cols={3} />
        </TableCard>
      ) : subscribers.isError ? (
        <ErrorText error={subscribers.error} />
      ) : subscribers.data ? (
        <>
          <StatGrid>
            <StatCard title='有效订阅' value={counts.subscribed} />
            <StatCard title='今日新增' value={countSubscribedToday(subscribers.data)} />
            <StatCard title='本月新增' value={countSubscribedThisMonth(subscribers.data)} />
            <StatCard title='待确认' value={counts.pending} />
          </StatGrid>
          <TableCard>
            {all.length > 0 ? (
              <ListToolbar className='border-border-light border-b p-2 sm:px-3'>
                <SearchBox value={state.q} onChange={(q) => set({ q })} placeholder='搜索邮箱' />
                <FilterPopover active={state.status ? 1 : 0} onReset={() => set({ status: '' })}>
                  <FilterChoice
                    label='状态'
                    anyLabel='全部'
                    value={state.status}
                    onChange={(status) => set({ status })}
                    options={[
                      { value: 'subscribed', label: '已订阅', count: counts.subscribed },
                      { value: 'pending', label: '待确认', count: counts.pending },
                      { value: 'unsubscribed', label: '已退订', count: counts.unsubscribed },
                    ]}
                  />
                </FilterPopover>
              </ListToolbar>
            ) : null}
            {all.length === 0 ? (
              <EmptyState icon={Mail} title='还没有订阅者' body='读者在前台订阅后会出现在这里。' />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Mail} title='没有匹配的订阅者' action={<Button size='sm' onClick={() => set({ q: '', status: '' })}>清除筛选</Button>} />
            ) : (
              <>
                <DataTable columns={columns} data={slice.rows} getRowId={(row) => String(row.id)} caption='订阅者' />
                <PageFooter slice={slice} onPage={(page) => set({ page })} onSize={(size) => set({ size })} />
              </>
            )}
          </TableCard>
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
