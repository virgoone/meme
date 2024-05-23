import React, { Suspense } from 'react'

import { Table } from '~/components/data-table'
import { SearchParams } from '~/components/data-table/types'
import Loading from '~/components/loading/Loading'

import { getBySearch } from './_lib/queries'
import { searchParamsSchema } from './_lib/validations'
import { getColumns } from './_mods/columns'
import { TableToolbarActions } from './_mods/toolbar-action'

export interface IndexPageProps {
  searchParams: SearchParams
}

export default async function AdminPostPage({ searchParams }: IndexPageProps) {
  const search = searchParamsSchema.parse(searchParams)

  const searchPromise = getBySearch(search)
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6">
          <Loading />
        </div>
      }
    >
      <Table
        getColumns={getColumns}
        searchPromise={searchPromise}
        toolbarElement={<TableToolbarActions />}
      />
    </Suspense>
  )
}
