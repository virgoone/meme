'use client'

import { StatCard, StatGrid } from '~/components/admin/StatCard'
import { SimpleTable, type DataTableColumn } from '~/components/data-table'
import { formatUTCDate } from '~/lib/date'

type SubscriberRow = {
  id?: string | number
  email?: string
  subscribedAt?: Date | string | null
}

export default function SubscribersCard(props: {
  count: {
    today_count?: number
    total?: number
    this_month_count?: number
  }
  dataSource: SubscriberRow[]
}) {
  const { dataSource, count } = props
  const columns: DataTableColumn<SubscriberRow>[] = [
    {
      id: 'email',
      header: 'Email',
      cell: (row) => row.email,
    },
    {
      id: 'subscribedAt',
      header: '订阅时间',
      cell: (row) => (row.subscribedAt ? formatUTCDate(row.subscribedAt) : '-'),
    },
  ]

  return (
    <>
      <StatGrid>
        <StatCard title="总订阅数" value={count.total} />
        <StatCard title="今日订阅数" value={count.today_count} />
        <StatCard title="本月订阅数" value={count.this_month_count} />
      </StatGrid>

      <div className="mt-6">
        <SimpleTable
          columns={columns}
          data={dataSource}
          getRowId={(row, index) => String(row.id ?? row.email ?? index)}
        />
      </div>
    </>
  )
}
