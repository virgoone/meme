/**
 * Sluice's table (sluice/web/src/components/ui/data-table.tsx): a pill-shaped header
 * on the ground color, 52 px rows with hairlines and a rounded hover band on
 * clickable rows. Sluice builds it with TanStack Table v9 and no row features;
 * Meme is on v8, so this renders the same markup from plain column definitions.
 */
import type * as React from 'react';

import { cn } from '@bunship-ai/ui/lib/utils';

import { Skeleton } from './ui';

export type Column<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hidden below the sm breakpoint. */
  hideOnMobile?: boolean;
};

export function DataTable<T>({ columns, data, getRowId, onRowClick, rowClassName, className, caption }: {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
  caption?: string;
}) {
  // With columns hidden on phones, the last one still shown there closes the header pill.
  const shownOnPhone = columns.filter((column) => !column.hideOnMobile);
  const phoneLast = shownOnPhone.length < columns.length ? shownOnPhone[shownOnPhone.length - 1]?.id : undefined;
  return (
    <div className={cn('scrollbar-thin relative min-w-0 overflow-x-auto p-1 sm:p-2', className)}>
      <table className='w-full border-separate border-spacing-0 font-desc text-title type-base'>
        {caption ? <caption className='sr-only'>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope='col'
                className={cn(
                  'h-9 whitespace-nowrap bg-bg px-2 text-left font-bold text-description type-xs first:rounded-l-full first:pl-3 last:rounded-r-full last:pr-3 sm:px-2.5 sm:last:pr-4 sm:first:pl-4',
                  column.hideOnMobile && 'hidden sm:table-cell',
                  column.id === phoneLast && 'max-sm:rounded-r-full max-sm:pr-3',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowId(row)}
              onClick={onRowClick ? (event) => {
                // Links and buttons inside a row keep their own action.
                if ((event.target as HTMLElement).closest('a,button,input,label')) return;
                onRowClick(row);
              } : undefined}
              className={cn(
                'group/row [&:last-child>td]:border-b-0',
                onRowClick && 'cursor-pointer [&:hover>td:first-child]:rounded-l-ui-md [&:hover>td:last-child]:rounded-r-ui-md [&:hover>td]:bg-fill-weak',
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    'h-[52px] border-border-light border-b px-2 py-2 align-middle transition-colors first:pl-3 last:pr-3 sm:px-2.5 sm:last:pr-4 sm:first:pl-4',
                    column.hideOnMobile && 'hidden sm:table-cell',
                    column.id === phoneLast && 'max-sm:pr-3',
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role='status' aria-busy='true' aria-label='加载中' className='p-1 sm:p-2'>
      <div className='flex h-9 items-center gap-4 rounded-full bg-bg px-3 sm:px-4'>
        {Array.from({ length: cols }, (_, j) => <Skeleton key={j} className={cn('h-3 min-w-0 flex-1', j > 1 && 'hidden sm:block')} />)}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className='flex h-[52px] items-center gap-4 border-border-light border-b px-3 last:border-0 sm:px-4'>
          {Array.from({ length: cols }, (_, j) => (
            <div key={j} className={cn('min-w-0 flex-1', j > 1 && 'hidden sm:block')}><Skeleton className={j === 0 ? 'h-3 w-4/5' : 'h-3 w-3/5'} /></div>
          ))}
        </div>
      ))}
    </div>
  );
}
