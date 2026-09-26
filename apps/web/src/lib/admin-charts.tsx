import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@bunship-ai/ui/components/chart';

import type { DailyPoint } from './admin-queries';

/* Every chart plots a single series in the ink colour, so no legend is needed and
   colour never has to carry identity. Marks follow the house specs: 2px lines,
   ≤ 24px bars with a 4px rounded data end, hairline solid grid. */

const ink = { color: 'var(--foreground)' };

const formatCompact = (value: number) =>
  value >= 10_000 ? `${Number((value / 10_000).toFixed(1))} 万` : value >= 1_000 ? `${Number((value / 1_000).toFixed(1))}k` : String(value);

const shortDay = (day: string) => day.slice(5).replace('-', '/');
const shortMonth = (month: string) => `${Number(month.slice(5))}月`;
const longDay = (day: string) => {
  const [year, month, date] = day.split('-');
  return `${year} 年 ${Number(month)} 月 ${Number(date)} 日`;
};

function axisTicks(points: Array<{ day: string }>, every: number) {
  return points.filter((_, index) => index % every === 0 || index === points.length - 1).map((point) => point.day);
}

export function DailyAreaChart({ data, label, height = 220 }: { data: DailyPoint[]; label: string; height?: number }) {
  const config: ChartConfig = { value: { label, ...ink } };
  return (
    <ChartContainer config={config} className='aspect-auto w-full' style={{ height }}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='0' />
        <XAxis dataKey='day' ticks={axisTicks(data, 7)} tickFormatter={shortDay} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis width={36} tickFormatter={formatCompact} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={{ stroke: 'var(--border)' }} content={<ChartTooltipContent indicator='line' labelFormatter={(value) => longDay(String(value))} />} />
        <Area type='monotone' dataKey='value' stroke='var(--color-value)' strokeWidth={2} fill='var(--color-value)' fillOpacity={0.1} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}

export function DailyLineChart({ data, label, height = 220 }: { data: DailyPoint[]; label: string; height?: number }) {
  const config: ChartConfig = { value: { label, ...ink } };
  return (
    <ChartContainer config={config} className='aspect-auto w-full' style={{ height }}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='0' />
        <XAxis dataKey='day' ticks={axisTicks(data, 15)} tickFormatter={shortDay} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis width={36} tickFormatter={formatCompact} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={{ stroke: 'var(--border)' }} content={<ChartTooltipContent indicator='line' labelFormatter={(value) => longDay(String(value))} />} />
        <Line type='monotone' dataKey='value' stroke='var(--color-value)' strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function DailyBarChart({ data, label, height = 160 }: { data: DailyPoint[]; label: string; height?: number }) {
  const config: ChartConfig = { value: { label, ...ink } };
  return (
    <ChartContainer config={config} className='aspect-auto w-full' style={{ height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='0' />
        <XAxis dataKey='day' ticks={axisTicks(data, 7)} tickFormatter={shortDay} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: 'var(--muted-surface)' }} content={<ChartTooltipContent indicator='line' labelFormatter={(value) => longDay(String(value))} />} />
        <Bar dataKey='value' fill='var(--color-value)' radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

export function MonthlyBarChart({ data, label, height = 160 }: { data: Array<{ month: string; value: number }>; label: string; height?: number }) {
  const config: ChartConfig = { value: { label, ...ink } };
  return (
    <ChartContainer config={config} className='aspect-auto w-full' style={{ height }}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={4}>
        <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='0' />
        <XAxis dataKey='month' tickFormatter={shortMonth} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: 'var(--muted-surface)' }} content={<ChartTooltipContent indicator='line' labelFormatter={(value) => String(value).replace('-', ' 年 ').concat(' 月')} />} />
        <Bar dataKey='value' fill='var(--color-value)' radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}

export function TopPostsChart({ data, label }: { data: Array<{ id: string; title: string; views: number }>; label: string }) {
  const config: ChartConfig = { views: { label, ...ink } };
  const rows = data.map((post) => ({ ...post, short: post.title.length > 18 ? `${post.title.slice(0, 18)}…` : post.title }));
  return (
    <ChartContainer config={config} className='aspect-auto w-full' style={{ height: Math.max(160, rows.length * 34 + 16) }}>
      <BarChart data={rows} layout='vertical' margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke='var(--border)' strokeDasharray='0' />
        <XAxis type='number' hide />
        <YAxis type='category' dataKey='short' width={168} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
        <ChartTooltip cursor={{ fill: 'var(--muted-surface)' }} content={<ChartTooltipContent indicator='line' labelKey='title' labelFormatter={(_, payload) => String(payload?.[0]?.payload?.title ?? '')} />} />
        <Bar dataKey='views' fill='var(--color-views)' radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} label={{ position: 'right', fontSize: 12, fill: 'var(--muted-foreground)', formatter: (value: unknown) => formatCompact(Number(value)) }} />
      </BarChart>
    </ChartContainer>
  );
}

export function StatValue({ value }: { value: number }) {
  return <>{formatCompact(value)}</>;
}
