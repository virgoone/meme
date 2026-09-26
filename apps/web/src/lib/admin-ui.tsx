import { DataTable } from '@bunship-ai/data-table/components/data-table';
import { DataTableProvider } from '@bunship-ai/data-table/components/data-table-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@bunship-ai/ui/components/card';
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
    <header className='flex flex-wrap items-end justify-between gap-4 border-border border-b pb-5'>
      <div className='min-w-0'>
        <h1 className='font-semibold text-2xl leading-tight tracking-tight'>{title}</h1>
        {description ? <p className='mt-1 text-muted-foreground text-sm'>{description}</p> : null}
      </div>
      {action ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{action}</div> : null}
    </header>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>{children}</div>;
}

export function StatCard({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <Card className='gap-2 py-4'>
      <CardHeader className='px-5'>
        <CardDescription className='text-xs'>{title}</CardDescription>
      </CardHeader>
      <CardContent className='px-5'>
        <strong className='block font-semibold text-2xl tabular-nums tracking-tight'>{value}</strong>
        {hint ? <span className='mt-1 block text-muted-foreground text-xs'>{hint}</span> : null}
      </CardContent>
    </Card>
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
    <Card className={cn('gap-0 py-0', className)}>
      {title ? (
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-3 border-border border-b px-5 py-4'>
          <div className='grid gap-1'>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn('px-5 py-5', bodyClassName)}>{children}</CardContent>
    </Card>
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
