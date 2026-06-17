'use client'

import CountUp from 'react-countup'

export function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value?: number
  subtitle?: string
}) {
  return (
    <section className="rounded-lg border border-kumo-line bg-kumo-base p-4">
      <div className="text-sm text-kumo-muted">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-kumo-strong">
        <CountUp end={Number(value ?? 0)} separator="," />
      </div>
      {subtitle ? (
        <p className="mt-1 text-sm text-kumo-muted">{subtitle}</p>
      ) : null}
    </section>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-3">{children}</div>
}
