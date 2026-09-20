import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import { useAdminNewsletters, type Newsletter } from '../lib/admin-queries';
import { AdminPageHeader, AdminTable, StatCard } from '../lib/admin-ui';
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
        title='Newsletters'
        description='已创建和已发送的 newsletter。'
        action={
          <Link to='/admin/newsletters/new' className='admin-button'>
            New
          </Link>
        }
      />

      {newsletters.isLoading ? (
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
              title='Today Newsletters'
              value={countTodaySent(newsletters.data)}
            />
            <StatCard
              title='Month Newsletters'
              value={countThisMonth(newsletters.data)}
            />
            <StatCard title='Total Newsletters' value={newsletters.data.length} />
          </div>
          <AdminTable
            columns={['Subject', 'Time', 'Created']}
            rows={newsletters.data.map((newsletter) => [
              newsletter.subject ?? `Newsletter #${newsletter.id}`,
              newsletter.sentAt ? formatDate(newsletter.sentAt) : '-',
              formatDate(newsletter.createdAt),
            ])}
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
