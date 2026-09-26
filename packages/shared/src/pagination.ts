export const BLOG_PAGE_SIZE = 10;

export type PostPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function normalizePage(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
