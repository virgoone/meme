import { expect, test } from 'bun:test';

import type { AdminStats } from '../src/lib/admin-queries';
import { buildViewsBreakdown, dayBreakdown, OTHER_KEY, PAGES_KEY } from '../src/lib/views-breakdown';

const byPost: AdminStats['views']['byPost'] = {
  posts: ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, title: `Post ${id}`, slug: id })),
  days: [
    { day: '2026-10-05', pages: 3, posts: { a: 1, g: 9 } },
    { day: '2026-10-06', pages: 0, posts: { b: 2, c: 2 } },
    { day: '2026-10-07', pages: 4, posts: { a: 5, b: 1, c: 1, d: 1, e: 1, f: 1 } },
  ],
};

test('the most-read articles in the range get colours, the rest fold into one layer', () => {
  const { series, rows, total } = buildViewsBreakdown(byPost, 3);
  expect(series.map((item) => item.key)).toEqual(['g', 'a', 'b', 'c', 'd', OTHER_KEY, PAGES_KEY]);
  expect(series.slice(0, 5).map((item) => item.color)).toEqual([1, 2, 3, 4, 5].map((n) => `var(--views-${n})`));
  expect(series.find((item) => item.key === OTHER_KEY)).toMatchObject({ label: '其他 2 篇文章', total: 2, ids: ['e', 'f'] });
  expect(total).toBe(31);
  // Each row's layers add up to the day total.
  for (const row of rows) expect(series.reduce((sum, item) => sum + Number(row[item.key]), 0)).toBe(row.total);
  expect(rows.at(-1)).toMatchObject({ day: '2026-10-07', total: 14, other: 2, pages: 4, top: 'a' });
});

test('changing the range re-ranks against that window only', () => {
  const { series, rows } = buildViewsBreakdown(byPost, 1);
  expect(series[0]).toMatchObject({ key: 'a', total: 5 });
  expect(series.some((item) => item.key === 'g')).toBe(false);
  expect(rows).toHaveLength(1);
});

test('a day with only article views has no pages layer on top', () => {
  const { rows } = buildViewsBreakdown(byPost, 3);
  expect(rows[1]).toMatchObject({ day: '2026-10-06', total: 4, pages: 0, top: 'b' });
});

test('day breakdown lists every article read that day with shares', () => {
  const { series } = buildViewsBreakdown(byPost, 3);
  const day = dayBreakdown(byPost, '2026-10-07', series);
  expect(day.total).toBe(14);
  expect(day.articles).toBe(6);
  expect(day.items.map((item) => item.key)).toEqual(['a', PAGES_KEY, 'b', 'c', 'd', 'e', 'f']);
  expect(day.items[0]).toMatchObject({ value: 5, color: 'var(--views-2)', slug: 'a' });
  expect(day.items.find((item) => item.key === 'e')?.color).toBe('var(--views-other)');
  expect(day.items.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1);
  expect(dayBreakdown(byPost, '2026-01-01', series)).toEqual({ total: 0, articles: 0, items: [] });
});
