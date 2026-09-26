/** Preserve the former footer's Chinese units; the tooltip keeps the exact PV. */
export function formatTotalViews(value: number) {
  if (value >= 100_000_000) return `${Number((value / 100_000_000).toFixed(1))}亿`;
  if (value >= 10_000) return `${Number((value / 10_000).toFixed(1))}万`;
  return Intl.NumberFormat('en-US').format(value);
}
