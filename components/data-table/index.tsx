'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button, Table as KumoTable } from '@cloudflare/kumo'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import { PageProps } from '~/lib/types'

export type DataTableColumn<TData> = {
  id: string
  header: React.ReactNode
  className?: string
  cell: (row: TData) => React.ReactNode
}

interface TableProps<TData extends { id?: string } = { id?: string }> {
  searchPromise: Promise<PageProps<TData> & { pageCount?: number }>
  deleteAction?: (ids: string[]) => Promise<void>
  toolbarElement?: React.ReactNode
  getColumns: () => DataTableColumn<TData>[]
}

export function SimpleTable<TData>({
  columns,
  data,
  getRowId,
  empty = 'No records found.',
}: {
  columns: DataTableColumn<TData>[]
  data: TData[]
  getRowId?: (row: TData, index: number) => string
  empty?: React.ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-kumo-line bg-kumo-base">
      <KumoTable className="min-w-full">
        <KumoTable.Header sticky>
          <KumoTable.Row>
            {columns.map((column) => (
              <KumoTable.Head key={column.id} className={column.className}>
                {column.header}
              </KumoTable.Head>
            ))}
          </KumoTable.Row>
        </KumoTable.Header>
        <KumoTable.Body>
          {data.length > 0 ? (
            data.map((row, index) => (
              <KumoTable.Row key={getRowId?.(row, index) ?? index}>
                {columns.map((column) => (
                  <KumoTable.Cell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </KumoTable.Cell>
                ))}
              </KumoTable.Row>
            ))
          ) : (
            <KumoTable.Row>
              <KumoTable.Cell colSpan={columns.length}>
                <div className="py-10 text-center text-sm text-kumo-muted">
                  {empty}
                </div>
              </KumoTable.Cell>
            </KumoTable.Row>
          )}
        </KumoTable.Body>
      </KumoTable>
    </div>
  )
}

export function Table<TData extends { id?: string }>({
  searchPromise,
  toolbarElement,
  getColumns,
}: TableProps<TData>) {
  const result = React.use(searchPromise)
  const data = result.data
  const page = result.page ?? 1
  const pageSize = result.pageSize ?? 10
  const total = result.total ?? data.length
  const pageCount = result.pageCount ?? Math.max(1, Math.ceil(total / pageSize))
  const columns = React.useMemo(() => getColumns(), [getColumns])

  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const pushPage = React.useCallback(
    (nextPage: number, nextPageSize = pageSize) => {
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('page', String(Math.max(1, nextPage)))
      newSearchParams.set('pageSize', String(nextPageSize))
      router.push(`${pathname}?${newSearchParams.toString()}`, {
        scroll: false,
      })
    },
    [pageSize, pathname, router, searchParams],
  )

  return (
    <div className="w-full space-y-3">
      {toolbarElement ? (
        <div className="flex w-full items-center justify-end gap-2">
          {toolbarElement}
        </div>
      ) : null}

      <SimpleTable
        columns={columns}
        data={data}
        getRowId={(row, index) => row.id ?? String(index)}
      />

      <div className="flex flex-col gap-3 text-sm text-kumo-muted sm:flex-row sm:items-center sm:justify-between">
        <div>
          {total} records · page {page} of {pageCount}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            aria-label="First page"
            disabled={page <= 1}
            onClick={() => pushPage(1)}
            shape="square"
            size="sm"
            type="button"
            variant="secondary"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => pushPage(page - 1)}
            shape="square"
            size="sm"
            type="button"
            variant="secondary"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => pushPage(page + 1)}
            shape="square"
            size="sm"
            type="button"
            variant="secondary"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            aria-label="Last page"
            disabled={page >= pageCount}
            onClick={() => pushPage(pageCount)}
            shape="square"
            size="sm"
            type="button"
            variant="secondary"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
