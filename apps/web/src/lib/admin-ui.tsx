import { DataTable } from '@bunship-ai/data-table/components/data-table';
import { DataTableProvider } from '@bunship-ai/data-table/components/data-table-provider';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { cn } from '@bunship-ai/ui/lib/utils';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

/** Page scaffold: full width, consistent vertical rhythm. */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('flex w-full min-w-0 flex-col gap-6', className)}>{children}</section>;
}

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <h1 className='min-w-0 truncate font-medium text-2xl leading-8 tracking-[-0.01em] max-sm:text-xl'>{title}</h1>
        {description ? <p className='max-w-2xl text-pretty text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      {action ? <div className='flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5'>{action}</div> : null}
    </header>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>{children}</div>;
}

/** Sluice stat tile: hairline box, quiet label, medium-weight tabular number. */
export function StatCard({ title, value, hint, extra }: { title: string; value: ReactNode; hint?: string; extra?: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4'>
      <span className='text-muted-foreground text-[13px]'>{title}</span>
      <strong className='truncate font-medium text-2xl tabular-nums tracking-tight'>{value}</strong>
      {hint ? <span className='text-muted-foreground text-xs'>{hint}</span> : null}
      {extra}
    </div>
  );
}

export function SectionCard({ title, description, action, children, className, bodyClassName }: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-border bg-card', className)}>
      {title ? (
        <header className='flex min-h-12 flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4'>
          <div className='grid min-w-0 gap-0.5'>
            <h2 className='font-medium text-[15px] leading-[22px]'>{title}</h2>
            {description ? <p className='text-muted-foreground text-[13px]'>{description}</p> : null}
          </div>
          {action ? <div className='flex shrink-0 flex-wrap items-center gap-1.5'>{action}</div> : null}
        </header>
      ) : null}
      <div className={cn('px-5 pt-3 pb-5', !title && 'pt-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function ErrorText({ error, className }: { error: unknown; className?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return <p role='alert' className={cn('text-destructive text-sm', className)}>{message}</p>;
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
  if (state === 'error') return <p className='text-destructive text-sm'>{error}</p>;
  return null;
}

export function AdminTable({ columns, rows }: { columns: string[]; rows: (string | number | null | undefined)[][] }) {
  const tableColumns = columns.map((column, index): DataTableColumn<RowData> => ({
    id: `${index}-${column}`,
    header: column,
    cell: (row) => row[index] ?? '-',
  }));
  const tableRows = rows.map((row, index) => ({ id: String(index), ...row }));
  return <SimpleDataTable columns={tableColumns} data={tableRows} />;
}

type RowData = Record<number, string | number | null | undefined> & { id: string };

export type DataTableColumn<TData> = {
  id: string;
  header: ReactNode;
  className?: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
  cell: (row: TData) => ReactNode;
};

export function SimpleDataTable<TData>({ columns, data, getRowId, pageSize = 10 }: {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  pageSize?: number;
}) {
  const tableColumns: ColumnDef<TData>[] = columns.map((column) => ({
    id: column.id,
    header: () => column.header,
    cell: ({ row }) => column.cell(row.original),
    size: column.size,
    minSize: column.minSize,
    maxSize: column.maxSize,
    enableSorting: false,
    enableHiding: false,
  }));

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  return (
    <DataTableProvider locale='zh'>
      <DataTable table={table} showPagination={data.length > pageSize} />
    </DataTableProvider>
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
