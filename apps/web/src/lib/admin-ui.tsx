/**
 * Page primitives shared by the admin routes. They render Sluice's console pieces
 * (lib/sluice): PageHeader, the Stat tile, a hairline card, and the TableCard +
 * DataTable + PageFooter list frame, so every admin page follows the same layout.
 */
import { cn } from '@bunship-ai/ui/lib/utils';
import { type ReactNode, useState } from 'react';

import { type Column, DataTable } from './sluice/data-table';
import { PageFooter, paginate } from './sluice/list-controls';
import { PageHeader, Skeleton, TableCard } from './sluice/ui';

/** Page scaffold; the shell's main element already stacks pages with a 24 px gap. */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('flex w-full min-w-0 flex-col gap-6', className)}>{children}</section>;
}

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <PageHeader title={title} description={description} actions={action} />;
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>{children}</div>;
}

/** sluice components/common.tsx Stat */
export function StatCard({ title, value, hint, extra }: { title: string; value: ReactNode; hint?: string; extra?: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-1 rounded-ui-xl border border-border-light bg-surface p-4'>
      <span className='font-desc text-description type-sm'>{title}</span>
      <span className='truncate font-medium text-title type-3xl tabular-nums'>{value}</span>
      {hint ? <span className='font-desc text-description type-sm'>{hint}</span> : null}
      {extra}
    </div>
  );
}

/** A hairline card with Sluice's CardHeader (sluice ui/card.tsx) typography. */
export function SectionCard({ title, description, action, children, className, bodyClassName }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-ui-xl border border-border-light bg-surface', className)}>
      {title ? (
        <div className='flex min-h-12 flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 pt-3.5'>
          <div className='min-w-0'>
            <h2 className='font-medium text-title type-md'>{title}</h2>
            {description ? <p className='mt-0.5 font-desc text-description type-sm'>{description}</p> : null}
          </div>
          {action ? <div className='flex shrink-0 flex-wrap items-center gap-1.5'>{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('px-4 pt-3 pb-4', !title && 'pt-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function ErrorText({ error, className }: { error: unknown; className?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return <p role='alert' className={cn('font-desc text-danger-fg type-base', className)}>{message}</p>;
}

export function AdminState({ state, error }: { state: 'loading' | 'error' | 'success'; error: string | null }) {
  if (state === 'loading') {
    return (
      <div role='status' aria-label='加载中' className='grid gap-2'>
        <Skeleton className='h-4 w-1/2' />
        <Skeleton className='h-4 w-2/3' />
        <Skeleton className='h-4 w-1/3' />
      </div>
    );
  }
  if (state === 'error') return <p className='text-danger-fg type-base'>{error}</p>;
  return null;
}

export type DataTableColumn<TData> = {
  id: string;
  header: ReactNode;
  className?: string;
  /** Kept for older call sites; Sluice's table sizes columns from content. */
  size?: number;
  minSize?: number;
  maxSize?: number;
  hideOnMobile?: boolean;
  cell: (row: TData) => ReactNode;
};

/**
 * A client-paged list in Sluice's frame: TableCard, DataTable and PageFooter.
 * `toolbar` sits in the card above the table (sluice ListToolbar placement).
 */
export function SimpleDataTable<TData>({ columns, data, getRowId, pageSize = 25, toolbar, onRowClick, caption, empty }: {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  pageSize?: number;
  toolbar?: ReactNode;
  onRowClick?: (row: TData) => void;
  caption?: string;
  /** Shown instead of the table when `data` is empty. */
  empty?: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const slice = paginate(data, page, size);
  const ids = new Map(data.map((row, index) => [row, getRowId ? getRowId(row, index) : String(index)]));
  const tableColumns: Column<TData>[] = columns.map((column) => ({ id: column.id, header: column.header, cell: column.cell, hideOnMobile: column.hideOnMobile, className: column.className }));
  return (
    <TableCard>
      {toolbar ? <div className='border-border-light border-b p-2 sm:px-3'>{toolbar}</div> : null}
      {data.length === 0 && empty ? empty : (
        <>
          <DataTable columns={tableColumns} data={slice.rows} getRowId={(row) => ids.get(row) ?? ''} onRowClick={onRowClick} caption={caption} />
          <PageFooter slice={slice} onPage={setPage} onSize={(next) => { setSize(next); setPage(1); }} />
        </>
      )}
    </TableCard>
  );
}

export function countByDay<T extends { createdAt: string | null }>(rows: T[], offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  const target = date.toISOString().slice(0, 10);
  return rows.filter((row) => row.createdAt?.slice(0, 10) === target).length;
}

export function countThisMonth<T extends { createdAt: string | null }>(rows: T[]) {
  const target = new Date().toISOString().slice(0, 7);
  return rows.filter((row) => row.createdAt?.slice(0, 7) === target).length;
}

export function AdminTable({ columns, rows }: { columns: string[]; rows: (string | number | null | undefined)[][] }) {
  const tableColumns = columns.map((column, index): DataTableColumn<RowData> => ({ id: `${index}-${column}`, header: column, cell: (row) => row[index] ?? '-' }));
  const tableRows = rows.map((row, index) => ({ id: String(index), ...row }));
  return <SimpleDataTable columns={tableColumns} data={tableRows} getRowId={(row) => row.id} />;
}

type RowData = Record<number, string | number | null | undefined> & { id: string };
