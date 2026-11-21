import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Mail, Send } from 'lucide-react';

import { type Newsletter, useAdminNewsletters } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, ErrorText, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { FilterChoice, FilterPopover, ListToolbar, matches, PageFooter, paginate, SearchBox, useUrlList } from '../lib/sluice/list-controls';
import { Badge, Button, EmptyState, TableCard } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/newsletters')({
  component: AdminNewslettersRoute,
});

const NEWSLETTER_KEYS = ['status'] as const;

type NewsletterStatus = 'sent' | 'sending' | 'draft';

function statusOf(row: Newsletter): NewsletterStatus {
  return row.sentAt ? 'sent' : row.campaignStatus === 'sending' ? 'sending' : 'draft';
}

function AdminNewslettersRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const newsletters = useAdminNewsletters();

  if (pathname !== '/admin/newsletters') {
    return <Outlet />;
  }

  return <AdminNewslettersPage newsletters={newsletters} />;
}

const columns: Column<Newsletter>[] = [
  {
    id: 'subject',
    header: '邮件主题',
    className: 'max-w-[200px] sm:max-w-md',
    cell: (row) => <span className='block truncate font-medium text-title'>{row.subject ?? `邮件 #${row.id}`}</span>,
  },
  {
    id: 'status',
    header: '状态',
    cell: (row) => {
      const status = statusOf(row);
      return status === 'sent' ? <Badge tone='ok'>已发送</Badge>
        : status === 'sending' ? <Badge tone='progress'>发送中</Badge>
          : <Badge tone='neutral'>草稿</Badge>;
    },
  },
  {
    id: 'created',
    header: '创建时间',
    hideOnMobile: true,
    cell: (row) => <span className='whitespace-nowrap text-description type-sm'>{formatDate(row.createdAt)}</span>,
  },
  {
    id: 'action',
    header: <span className='sr-only'>操作</span>,
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
          <span className='whitespace-nowrap text-description type-xs'>历史草稿</span>
        )}
      </div>
    ),
  },
];

function AdminNewslettersPage({ newsletters }: { newsletters: ReturnType<typeof useAdminNewsletters> }) {
  const { state, set } = useUrlList(NEWSLETTER_KEYS);
  const all = newsletters.data ?? [];
  const counts: Record<NewsletterStatus, number> = { sent: 0, sending: 0, draft: 0 };
  for (const row of all) counts[statusOf(row)] += 1;
  const filtered = all.filter((row) => matches(state.q, row.subject, row.subject ? null : `邮件 #${row.id}`) && (!state.status || statusOf(row) === state.status));
  const slice = paginate(filtered, state.page, state.size);

  return (
    <AdminPage>
      <AdminPageHeader
        title='邮件群发'
        description='草稿、发送进度与历史邮件。'
        action={
          <Button variant='primary' asChild>
            <Link to='/admin/newsletters/new'><Send aria-hidden='true' />发送最近更新</Link>
          </Button>
        }
      />

      {newsletters.isPending ? (
        <TableCard>
          <TableSkeleton rows={6} cols={3} />
        </TableCard>
      ) : newsletters.isError ? (
        <ErrorText error={newsletters.error} />
      ) : newsletters.data ? (
        <>
          <StatGrid>
            <StatCard title='今日发送' value={countTodaySent(newsletters.data)} />
            <StatCard title='本月发送' value={countThisMonthSent(newsletters.data)} />
            <StatCard title='全部邮件' value={newsletters.data.length} />
          </StatGrid>
          <TableCard>
            {all.length > 0 ? (
              <ListToolbar className='border-border-light border-b p-2 sm:px-3'>
                <SearchBox value={state.q} onChange={(q) => set({ q })} placeholder='搜索邮件主题' />
                <FilterPopover active={state.status ? 1 : 0} onReset={() => set({ status: '' })}>
                  <FilterChoice
                    label='状态'
                    anyLabel='全部'
                    value={state.status}
                    onChange={(status) => set({ status })}
                    options={[
                      { value: 'sent', label: '已发送', count: counts.sent },
                      { value: 'sending', label: '发送中', count: counts.sending },
                      { value: 'draft', label: '草稿', count: counts.draft },
                    ]}
                  />
                </FilterPopover>
              </ListToolbar>
            ) : null}
            {all.length === 0 ? (
              <EmptyState icon={Mail} title='还没有邮件' body='草稿、发送进度与历史邮件会出现在这里。' />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Mail} title='没有匹配的邮件' action={<Button size='sm' onClick={() => set({ q: '', status: '' })}>清除筛选</Button>} />
            ) : (
              <>
                <DataTable columns={columns} data={slice.rows} getRowId={(row) => String(row.id)} caption='邮件群发' />
                <PageFooter slice={slice} onPage={(page) => set({ page })} onSize={(size) => set({ size })} />
              </>
            )}
          </TableCard>
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
