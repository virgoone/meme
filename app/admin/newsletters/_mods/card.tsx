'use client'

import { LinkButton } from '@cloudflare/kumo'

import { StatCard, StatGrid } from '~/components/admin/StatCard'
import { SimpleTable, type DataTableColumn } from '~/components/data-table'
import { formatUTCDate } from '~/lib/date'

type NewsletterRow = {
  id?: string | number
  subject?: string
  sentAt?: Date | string | null
}

export default function NewsLatterCard(props: {
  count: {
    today_count?: number
    total?: number
    this_month_count?: number
  }
  dataSource: NewsletterRow[]
}) {
  const { dataSource, count } = props
  const columns: DataTableColumn<NewsletterRow>[] = [
    {
      id: 'subject',
      header: 'Subject',
      cell: (row) => row.subject,
    },
    {
      id: 'sentAt',
      header: 'Time',
      cell: (row) => (row.sentAt ? formatUTCDate(row.sentAt) : '-'),
    },
  ]

  return (
    <>
      <StatGrid>
        <StatCard title="Today Newsletters" value={count.today_count} />
        <StatCard title="Month Newsletters" value={count.this_month_count} />
        <StatCard title="Total Newsletters" value={count.total} />
      </StatGrid>

      <div className="mt-6 space-y-3">
        <div className="flex justify-end">
          <LinkButton href="newsletters/new" variant="primary">
            New
          </LinkButton>
        </div>
        <SimpleTable
          columns={columns}
          data={dataSource}
          getRowId={(row, index) => String(row.id ?? row.subject ?? index)}
        />
      </div>
    </>
  )
}
