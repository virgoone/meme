import type { WorkerEnv } from '../../env';
import { dayViewsKey, postDayViewsKey, postViewsKey, totalViewsKey, viewDay } from './views';

export type DailyPoint = { day: string; value: number };

export type AdminStats = {
  generatedAt: string;
  views: {
    total: number;
    today: number;
    week: number;
    month: number;
    /** Last 30 days, oldest first, zero-filled. Starts on the day daily tracking shipped. */
    daily: DailyPoint[];
    /** First day that has a daily counter, or null before any were written. */
    trackedSince: string | null;
  };
  topPosts: Array<{ id: string; title: string; slug: string; views: number; last7: number; last30: number }>;
  subscribers: {
    active: number;
    total: number;
    today: number;
    month: number;
    /** Active subscribers per day for the last 90 days, oldest first. */
    daily: DailyPoint[];
  };
  comments: { total: number; month: number; daily: DailyPoint[] };
  guestbook: { total: number; month: number; daily: DailyPoint[] };
  publishing: { total: number; monthly: Array<{ month: string; value: number }> };
};

type SettingRow = { key: string; value: string };
type PostRow = { id: string; title: string; slug: string; published_at: string | null };
type SubscriberRow = { subscribed_at: number | string | null; unsubscribed_at: string | null };
type CreatedRow = { created_at: string | null };

const DAY_MS = 86_400_000;

export async function getAdminStats(env: WorkerEnv, now = new Date()): Promise<AdminStats> {
  const [settingRows, postRows, subscriberRows, commentRows, guestbookRows] = await Promise.all([
    env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'analytics:views:%'").all<SettingRow>(),
    env.DB.prepare('SELECT id, title, slug, published_at FROM imported_posts WHERE published_at IS NOT NULL').all<PostRow>(),
    env.DB.prepare('SELECT subscribed_at, unsubscribed_at FROM subscribers').all<SubscriberRow>(),
    env.DB.prepare('SELECT created_at FROM comments').all<CreatedRow>(),
    env.DB.prepare('SELECT created_at FROM guestbook').all<CreatedRow>(),
  ]);

  const counters = new Map(settingRows.results.map((row) => [row.key, toCount(row.value)]));
  const today = viewDay(now);
  const last30 = dayRange(now, 30);
  const last90 = dayRange(now, 90);
  const monthPrefix = today.slice(0, 7);

  // ---- page views ------------------------------------------------------------------
  const dailyViews = last30.map((day) => ({ day, value: counters.get(dayViewsKey(day)) ?? 0 }));
  const trackedDays = [...counters.keys()].filter((key) => key.startsWith('analytics:views:day:')).map((key) => key.slice('analytics:views:day:'.length)).sort();
  const sumDays = (days: string[]) => days.reduce((sum, day) => sum + (counters.get(dayViewsKey(day)) ?? 0), 0);
  const views = {
    total: counters.get(totalViewsKey) ?? 0,
    today: counters.get(dayViewsKey(today)) ?? 0,
    week: sumDays(dayRange(now, 7)),
    month: [...counters.entries()].filter(([key]) => key.startsWith(dayViewsKey(monthPrefix))).reduce((sum, [, value]) => sum + value, 0),
    daily: dailyViews,
    trackedSince: trackedDays[0] ?? null,
  };

  // ---- posts ---------------------------------------------------------------------
  const last7Set = new Set(dayRange(now, 7));
  const last30Set = new Set(last30);
  const topPosts = postRows.results
    .map((post) => {
      let last7 = 0;
      let last30Views = 0;
      for (const day of last30Set) {
        const value = counters.get(postDayViewsKey(post.id, day)) ?? 0;
        last30Views += value;
        if (last7Set.has(day)) last7 += value;
      }
      return { id: post.id, title: post.title, slug: post.slug, views: counters.get(postViewsKey(post.id)) ?? 0, last7, last30: last30Views };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // ---- subscribers -----------------------------------------------------------------
  const subscriptions = subscriberRows.results
    .map((row) => ({ subscribed: toDay(row.subscribed_at), unsubscribed: toDay(row.unsubscribed_at) }))
    .filter((row): row is { subscribed: string; unsubscribed: string | null } => row.subscribed !== null);
  const activeOn = (day: string) => subscriptions.filter((row) => row.subscribed <= day && (!row.unsubscribed || row.unsubscribed > day)).length;
  const subscribers = {
    active: activeOn(today),
    total: subscriptions.length,
    today: subscriptions.filter((row) => row.subscribed === today).length,
    month: subscriptions.filter((row) => row.subscribed.startsWith(monthPrefix)).length,
    daily: last90.map((day) => ({ day, value: activeOn(day) })),
  };

  // ---- engagement --------------------------------------------------------------------
  const commentDays = commentRows.results.map((row) => toDay(row.created_at)).filter((day): day is string => day !== null);
  const guestbookDays = guestbookRows.results.map((row) => toDay(row.created_at)).filter((day): day is string => day !== null);
  const countByDay = (days: string[]) => {
    const map = new Map<string, number>();
    for (const day of days) map.set(day, (map.get(day) ?? 0) + 1);
    return map;
  };
  const commentMap = countByDay(commentDays);
  const guestbookMap = countByDay(guestbookDays);
  const comments = {
    total: commentDays.length,
    month: commentDays.filter((day) => day.startsWith(monthPrefix)).length,
    daily: last30.map((day) => ({ day, value: commentMap.get(day) ?? 0 })),
  };
  const guestbook = {
    total: guestbookDays.length,
    month: guestbookDays.filter((day) => day.startsWith(monthPrefix)).length,
    daily: last30.map((day) => ({ day, value: guestbookMap.get(day) ?? 0 })),
  };

  // ---- publishing ---------------------------------------------------------------------
  const months = monthRange(now, 12);
  const monthMap = new Map<string, number>();
  for (const post of postRows.results) {
    const day = toDay(post.published_at);
    if (!day) continue;
    const month = day.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }
  const publishing = {
    total: postRows.results.length,
    monthly: months.map((month) => ({ month, value: monthMap.get(month) ?? 0 })),
  };

  return { generatedAt: now.toISOString(), views, topPosts, subscribers, comments, guestbook, publishing };
}

function toCount(value: string | null | undefined) {
  const parsed = Number(typeof value === 'string' ? value.replace(/^"|"$/g, '') : value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/** Days are keyed in the site's timezone (Asia/Shanghai), matching the view counters. */
function toDay(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (typeof value === 'number') {
    date = new Date(value > 1e12 ? value : value * 1000);
  } else if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    date = new Date(numeric > 1e12 ? numeric : numeric * 1000);
  } else {
    // SQLite CURRENT_TIMESTAMP has no zone marker but is UTC.
    date = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value);
  }
  return Number.isNaN(date.getTime()) ? null : viewDay(date);
}

function dayRange(now: Date, length: number) {
  const days: string[] = [];
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    days.push(viewDay(new Date(now.getTime() - offset * DAY_MS)));
  }
  return days;
}

function monthRange(now: Date, length: number) {
  const current = viewDay(now).slice(0, 7);
  const [year, month] = current.split('-').map(Number);
  const months: string[] = [];
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    const index = (year ?? 0) * 12 + ((month ?? 1) - 1) - offset;
    months.push(`${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`);
  }
  return months;
}
