import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@bunship-ai/ui/components/button';
import { ToggleGroup, ToggleGroupItem } from '@bunship-ai/ui/components/toggle-group';
import { cn } from '@bunship-ai/ui/lib/utils';

import { formatCompact, longDay, seriesSwatch, StackedViewsChart } from './admin-charts';
import type { AdminStats } from './admin-queries';
import { SectionCard } from './admin-ui';
import { buildViewsBreakdown, dayBreakdown } from './views-breakdown';

type ByPost = AdminStats['views']['byPost'];

export const VIEW_RANGES = [7, 30] as const;
export type ViewRange = (typeof VIEW_RANGES)[number];

/** Trend card (stacked by article) plus the day-detail card it drives. */
export function ViewsByArticle({ byPost, range, onRangeChange }: { byPost: ByPost; range: ViewRange; onRangeChange: (range: ViewRange) => void }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const lastDay = byPost.days.at(-1)?.day ?? null;
  const [selectedDay, setSelectedDay] = useState<string | null>(lastDay);

  const { series, rows, total } = useMemo(() => buildViewsBreakdown(byPost, range), [byPost, range]);
  const shown = focus ? series.filter((item) => item.key === focus) : series;
  const focused = focus ? series.find((item) => item.key === focus) : undefined;
  const day = selectedDay ?? lastDay;
  const detail = useMemo(() => (day ? dayBreakdown(byPost, day, series) : null), [byPost, day, series]);
  const dayIndex = day ? byPost.days.findIndex((item) => item.day === day) : -1;
  const isToday = day !== null && day === lastDay;

  const selectRange = (value: string) => {
    const next = Number(value);
    if (next !== 7 && next !== 30) return;
    onRangeChange(next);
    setFocus(null);
    setHover(null);
  };

  return (
    <>
      <SectionCard
        title='浏览趋势'
        description={
          total === 0
            ? '还没有按天的数据，读者访问后这里会开始出现柱子。'
            : focused
              ? `只看「${focused.label}」，近 ${range} 天 ${focused.total} 次。再点一次右侧条目恢复全部。`
              : `近 ${range} 天共 ${total} 次浏览，按文章分层，北京时间计日。点柱子查看当天明细。`
        }
        action={
          <ToggleGroup type='single' variant='outline' size='sm' value={String(range)} onValueChange={selectRange} aria-label='时间范围'>
            {VIEW_RANGES.map((value) => (
              <ToggleGroupItem key={value} value={String(value)} className='px-3 text-xs'>
                {value} 天
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      >
        <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]'>
          <StackedViewsChart
            rows={rows}
            series={shown}
            highlight={focus ? null : hover}
            selectedDay={day}
            onSelectDay={setSelectedDay}
          />
          <div className='grid content-start gap-0.5'>
            <div className='flex justify-between border-border border-b px-2 pb-2 text-muted-foreground text-xs'>
              <span>近 {range} 天 · 来源</span>
              <span>浏览</span>
            </div>
            {series.map((item) => (
              <button
                key={item.key}
                type='button'
                aria-pressed={focus === item.key}
                title={item.label}
                onMouseEnter={() => setHover(item.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(item.key)}
                onBlur={() => setHover(null)}
                onClick={() => setFocus((current) => (current === item.key ? null : item.key))}
                className={cn(
                  'grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted-surface focus-visible:outline-2 focus-visible:outline-ring',
                  focus === item.key && 'bg-muted-surface ring-1 ring-border',
                )}
              >
                <span aria-hidden='true' className='size-2.5 rounded-[2px]' style={seriesSwatch(item)} />
                <span className='truncate'>{item.label}</span>
                <span className='text-muted-foreground tabular-nums'>{formatCompact(item.total)}</span>
              </button>
            ))}
            {series.length > 0 ? <p className='px-2 pt-2 text-muted-foreground text-xs'>悬停高亮该层，点击只看这一项。</p> : null}
          </div>
        </div>
      </SectionCard>

      {detail && day ? (
        <SectionCard
          title={isToday ? '今日浏览构成' : `${longDay(day)}浏览构成`}
          description={
            detail.total === 0
              ? '这一天没有浏览。'
              : `共 ${detail.total} 次，来自 ${detail.articles} 篇文章${detail.items.some((item) => item.kind === 'pages') ? '与首页、列表页' : ''}。`
          }
          action={
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='前一天'
                disabled={dayIndex <= 0}
                onClick={() => setSelectedDay(byPost.days[dayIndex - 1]?.day ?? day)}
              >
                <ChevronLeft className='size-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='size-8'
                aria-label='后一天'
                disabled={dayIndex < 0 || dayIndex >= byPost.days.length - 1}
                onClick={() => setSelectedDay(byPost.days[dayIndex + 1]?.day ?? day)}
              >
                <ChevronRight className='size-4' />
              </Button>
              {!isToday ? (
                <Button variant='ghost' size='sm' className='text-xs' onClick={() => setSelectedDay(lastDay)}>
                  回到今天
                </Button>
              ) : null}
            </div>
          }
        >
          {detail.items.length > 0 ? (
            <ul className='grid gap-3'>
              {detail.items.map((item) => {
                const max = detail.items[0]?.value ?? 1;
                return (
                  <li key={item.key} className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5'>
                    <span className='flex min-w-0 items-center gap-2 text-sm'>
                      <span aria-hidden='true' className='size-2.5 shrink-0 rounded-[2px]' style={seriesSwatch(item)} />
                      {item.slug ? (
                        <Link to='/$slug' params={{ slug: item.slug }} className='truncate hover:underline' title={item.label}>
                          {item.label}
                        </Link>
                      ) : (
                        <span className='truncate'>{item.label}</span>
                      )}
                    </span>
                    <span className='text-sm tabular-nums'>
                      {item.value}
                      <span className='ml-2 inline-block w-9 text-right text-muted-foreground text-xs'>{Math.round(item.share * 100)}%</span>
                    </span>
                    <span aria-hidden='true' className='col-span-2 h-1 overflow-hidden rounded-full bg-muted-surface'>
                      <span className='block h-full rounded-full' style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className='text-muted-foreground text-sm'>没有可显示的浏览。</p>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

/** Thin composition bar and leading article for the "today" stat card; colours follow the trend card's range. */
export function TodayComposition({ byPost, range }: { byPost: ByPost; range: ViewRange }) {
  const { series } = useMemo(() => buildViewsBreakdown(byPost, range), [byPost, range]);
  const today = byPost.days.at(-1);
  if (!today) return null;
  const detail = dayBreakdown(byPost, today.day, series);
  if (detail.total === 0) return null;
  const lead = detail.items.find((item) => item.kind === 'post');
  return (
    <span className='mt-2 grid gap-1.5'>
      <span aria-hidden='true' className='flex h-1.5 overflow-hidden rounded-full bg-muted-surface'>
        {detail.items.map((item) => (
          <span key={item.key} className='block h-full' style={{ width: `${item.share * 100}%`, background: item.color }} />
        ))}
      </span>
      {lead ? (
        <span className='truncate text-muted-foreground text-xs' title={lead.label}>
          最多：{lead.label}（{lead.value}）
        </span>
      ) : null}
    </span>
  );
}
