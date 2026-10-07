import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@bunship-ai/ui/components/chart';

import type { DailyPoint } from './admin-queries';
import type { ViewRow, ViewSeries } from './views-breakdown';

/* Every chart plots a single series in the ink colour, so no legend is needed and
   colour never has to carry identity. Marks follow the house specs: 2px lines,
   ≤ 24px bars with a 4px rounded data end, hairline solid grid. */

const ink = { color: 'var(--foreground)' };

export const formatCompact = (value: number) =>
  value >= 10_000 ? `${Number((value / 10_000).toFixed(1))} 万` : value >= 1_000 ? `${Number((value / 1_000).toFixed(1))}k` : String(value);

const shortDay = (day: string) => day.slice(5).replace('-', '/');
const shortMonth = (month: string) => `${Number(month.slice(5))}月`;
export const longDay = (day: string) => {
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

/* Views split by article. The one dashboard chart where colour carries identity:
   five muted hues for the leading articles, grey for the rest, a hatch for
   non-article pages at the base. Only the top layer of each day gets the 4px
   rounded data end. */

const PAGES_HATCH = 'views-pages-hatch';

function StackSegment(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; fillOpacity?: number; rounded: boolean }) {
  const { x = 0, y = 0, width = 0, height = 0, fill, fillOpacity, rounded } = props;
  if (height <= 0 || width <= 0) return null;
  // A hairline gap between layers keeps adjacent hues apart.
  const h = Math.max(0, rounded ? height : height - 1);
  if (!rounded) return <rect x={x} y={y + (height - h)} width={width} height={h} fill={fill} fillOpacity={fillOpacity} />;
  const r = Math.min(4, h, width / 2);
  return (
    <path
      d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + h} Z`}
      fill={fill}
      fillOpacity={fillOpacity}
    />
  );
}

export function seriesSwatch(series: Pick<ViewSeries, 'kind' | 'color'>) {
  return series.kind === 'pages'
    ? { backgroundImage: 'repeating-linear-gradient(135deg, var(--views-pages) 0 2px, var(--views-pages-line) 2px 3px)' }
    : { background: series.color };
}

export function StackedViewsChart({
  rows,
  series,
  highlight,
  selectedDay,
  onSelectDay,
  height = 260,
}: {
  rows: ViewRow[];
  series: ViewSeries[];
  /** Dim every other layer (legend hover). */
  highlight?: string | null;
  selectedDay?: string | null;
  onSelectDay?: (day: string) => void;
  height?: number;
}) {
  const config: ChartConfig = Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color }]));
  // Recharts stacks in declaration order, bottom first; the legend lists top first.
  const stack = [...series].reverse();
  return (
    <ChartContainer config={config} className='aspect-auto w-full [&_.recharts-bar-rectangle]:cursor-pointer' style={{ height }}>
      <BarChart
        data={rows}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barCategoryGap={rows.length > 14 ? 3 : 10}
        onClick={(state) => {
          const day = state?.activeLabel;
          if (day && onSelectDay) onSelectDay(String(day));
        }}
      >
        <defs>
          <pattern id={PAGES_HATCH} width='4' height='4' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
            <rect width='4' height='4' fill='var(--views-pages)' />
            <rect width='1' height='4' fill='var(--views-pages-line)' />
          </pattern>
        </defs>
        <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='0' />
        {selectedDay ? <ReferenceArea x1={selectedDay} x2={selectedDay} fill='var(--muted-surface)' fillOpacity={1} ifOverflow='visible' /> : null}
        <XAxis dataKey='day' ticks={axisTicks(rows, rows.length > 14 ? 7 : 1)} tickFormatter={shortDay} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis width={36} tickFormatter={formatCompact} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={{ fill: 'var(--muted-surface)' }} content={<ViewsTooltip series={series} />} />
        {stack.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId='views'
            fill={item.kind === 'pages' ? `url(#${PAGES_HATCH})` : item.color}
            fillOpacity={highlight && highlight !== item.key ? 0.18 : 1}
            maxBarSize={24}
            isAnimationActive={false}
            shape={(shapeProps: unknown) => {
              const props = shapeProps as { payload?: ViewRow } & Parameters<typeof StackSegment>[0];
              // Round only the uppermost layer that is drawn for this day.
              const above = series.slice(0, series.indexOf(item));
              const rounded = Boolean(props.payload) && above.every((layer) => !Number(props.payload?.[layer.key] ?? 0));
              return <StackSegment {...props} rounded={rounded} />;
            }}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function ViewsTooltip({ active, payload, series }: { active?: boolean; payload?: Array<{ payload?: ViewRow }>; series: ViewSeries[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const layers = series
    .map((item) => ({ item, value: Number(row[item.key] ?? 0) }))
    .filter((layer) => layer.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <div className='grid min-w-56 max-w-72 gap-1.5 rounded-md border border-border bg-popover px-3 py-2.5 text-xs shadow-lg'>
      <div className='flex justify-between gap-3 font-medium'>
        <span>{longDay(row.day)}</span>
        <span className='tabular-nums'>{row.total} 次</span>
      </div>
      {layers.length === 0 ? <span className='text-muted-foreground'>没有浏览</span> : null}
      {layers.map(({ item, value }) => (
        <div key={item.key} className='grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2'>
          <span aria-hidden='true' className='size-2.5 rounded-[2px]' style={seriesSwatch(item)} />
          <span className='truncate text-muted-foreground'>{item.label}</span>
          <span className='font-medium tabular-nums'>{value}</span>
        </div>
      ))}
    </div>
  );
}
