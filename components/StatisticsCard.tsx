'use client'

import { Loader2 } from 'lucide-react'

import { StatCard } from '~/components/admin/StatCard'

export default function StatisticsCard(props: {
  title: string
  subtitle?: string
  count: number
  icon?: React.ReactNode
  loading?: boolean
}) {
  const { loading, title, count, subtitle } = props

  if (loading) {
    return (
      <section className="flex min-h-28 items-center justify-center rounded-lg border border-kumo-line bg-kumo-base p-4 text-kumo-muted">
        <Loader2 className="size-5 animate-spin" />
      </section>
    )
  }

  return <StatCard title={title} value={count} subtitle={subtitle} />
}
