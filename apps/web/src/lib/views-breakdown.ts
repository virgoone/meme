import type { AdminStats } from './admin-queries';

type ByPost = AdminStats['views']['byPost'];

export type ViewSeries = {
  key: string;
  label: string;
  kind: 'post' | 'other' | 'pages';
  /** CSS colour; the pages layer is drawn with a hatch pattern instead. */
  color: string;
  /** Views in the selected range. */
  total: number;
  slug?: string;
  /** Articles folded into the "other" layer. */
  ids?: string[];
};

export type ViewRow = { day: string; total: number; top: string | null } & Record<string, number | string | null>;

export const TOP_ARTICLES = 5;
export const PAGES_KEY = 'pages';
export const OTHER_KEY = 'other';

const seriesValue = (day: ByPost['days'][number], series: ViewSeries) =>
  series.kind === 'pages' ? day.pages : series.kind === 'other' ? (series.ids ?? []).reduce((sum, id) => sum + (day.posts[id] ?? 0), 0) : (day.posts[series.key] ?? 0);

/**
 * Layers for the last `range` days: the most-read articles in that range get their
 * own colour, the rest fold into one grey layer, and non-article pages sit underneath.
 * Series are ordered top of the stack first (legend order); rows carry one numeric
 * field per series key plus `top`, the uppermost non-empty layer of that day.
 */
export function buildViewsBreakdown(byPost: ByPost, range: number, topN = TOP_ARTICLES) {
  const days = byPost.days.slice(-range);
  const sums = new Map<string, number>();
  for (const day of days) for (const [id, value] of Object.entries(day.posts)) sums.set(id, (sums.get(id) ?? 0) + value);
  const ranked = byPost.posts
    .map((post) => ({ ...post, total: sums.get(post.id) ?? 0 }))
    .filter((post) => post.total > 0)
    .sort((a, b) => b.total - a.total || a.title.localeCompare(b.title, 'zh-CN'));

  const series: ViewSeries[] = ranked.slice(0, topN).map((post, index) => ({
    key: post.id,
    label: post.title,
    kind: 'post',
    color: `var(--views-${index + 1})`,
    total: post.total,
    slug: post.slug,
  }));
  const rest = ranked.slice(topN);
  if (rest.length > 0) {
    series.push({ key: OTHER_KEY, label: `其他 ${rest.length} 篇文章`, kind: 'other', color: 'var(--views-other)', total: rest.reduce((sum, post) => sum + post.total, 0), ids: rest.map((post) => post.id) });
  }
  const pagesTotal = days.reduce((sum, day) => sum + day.pages, 0);
  if (pagesTotal > 0) series.push({ key: PAGES_KEY, label: '首页与列表页', kind: 'pages', color: 'var(--views-pages-line)', total: pagesTotal });

  const rows: ViewRow[] = days.map((day) => {
    const row: ViewRow = { day: day.day, total: day.pages, top: null };
    let total = day.pages;
    for (const item of series) row[item.key] = seriesValue(day, item);
    for (const value of Object.values(day.posts)) total += value;
    row.total = total;
    row.top = series.find((item) => Number(row[item.key]) > 0)?.key ?? null;
    return row;
  });

  return { series, rows, total: rows.reduce((sum, row) => sum + row.total, 0) };
}

export type DayItem = { key: string; label: string; value: number; share: number; color: string; kind: ViewSeries['kind']; slug?: string };

/** Every article read on `day` (not just the coloured ones), most read first, pages included. */
export function dayBreakdown(byPost: ByPost, day: string, series: ViewSeries[]) {
  const entry = byPost.days.find((item) => item.day === day);
  if (!entry) return { total: 0, articles: 0, items: [] as DayItem[] };
  const colourOf = (id: string) => series.find((item) => item.key === id)?.color ?? 'var(--views-other)';
  const titles = new Map(byPost.posts.map((post) => [post.id, post]));
  const total = entry.pages + Object.values(entry.posts).reduce((sum, value) => sum + value, 0);
  const items: DayItem[] = Object.entries(entry.posts)
    .filter(([, value]) => value > 0)
    .map(([id, value]) => ({ key: id, label: titles.get(id)?.title ?? id, slug: titles.get(id)?.slug, value, share: 0, color: colourOf(id), kind: 'post' as const }));
  const articles = items.length;
  if (entry.pages > 0) items.push({ key: PAGES_KEY, label: '首页与列表页', value: entry.pages, share: 0, color: 'var(--views-pages-line)', kind: 'pages' });
  items.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-CN'));
  for (const item of items) item.share = total > 0 ? item.value / total : 0;
  return { total, articles, items };
}
