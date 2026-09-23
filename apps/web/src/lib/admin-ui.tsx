import { DataTable } from '@bunship-ai/data-table/components/data-table';
import { DataTableProvider } from '@bunship-ai/data-table/components/data-table-provider';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className='admin-page-header'>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className='admin-stat-card'>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function AdminState({
  state,
  error,
}: {
  state: 'loading' | 'error' | 'success';
  error: string | null;
}) {
  if (state === 'loading') {
    return (
      <div className='admin-inline-skeleton' role='status' aria-label='加载中'>
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (state === 'error') return <p className='admin-error'>{error}</p>;
  return null;
}

export function AdminTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | null | undefined)[][];
}) {
  const tableColumns = columns.map((column, index): DataTableColumn<RowData> => ({
    id: `${index}-${column}`,
    header: column,
    cell: (row) => row[index] ?? '-',
  }));
  const tableRows = rows.map((row, index) => ({ id: String(index), ...row }));

  return <SimpleDataTable columns={tableColumns} data={tableRows} />;
}

type RowData = Record<number, string | number | null | undefined> & {
  id: string;
};

export type DataTableColumn<TData> = {
  id: string;
  header: ReactNode;
  className?: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
  cell: (row: TData) => ReactNode;
};

export function SimpleDataTable<TData>({
  columns,
  data,
  getRowId,
  empty: _empty = 'No records found.',
}: {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  empty?: ReactNode;
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
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  });

  return (
    <DataTableProvider locale='zh'>
      <DataTable table={table} className='admin-data-table' />
    </DataTableProvider>
  );
}

export function countByDay<T extends { createdAt: string | null }>(
  rows: T[],
  offsetDays: number,
) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  const target = date.toISOString().slice(0, 10);
  return rows.filter((row) => row.createdAt?.slice(0, 10) === target).length;
}

export function countThisMonth<T extends { createdAt: string | null }>(
  rows: T[],
) {
  const target = new Date().toISOString().slice(0, 7);
  return rows.filter((row) => row.createdAt?.slice(0, 7) === target).length;
}
