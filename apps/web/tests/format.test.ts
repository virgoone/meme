import { describe, expect, test } from 'bun:test';

import { formatChineseDate, formatDateCompact } from '../src/lib/format';

describe('format helpers', () => {
  test('compact dates drop the year inside the current year', () => {
    const now = new Date('2026-09-26T00:00:00');
    expect(formatDateCompact('2026-09-25T07:15:00.000Z', now)).toMatch(/^09-2[45]$/);
    expect(formatDateCompact('2024-12-25T00:00:00.000Z', now)).toMatch(/^2024-12-2[45]$/);
    expect(formatDateCompact(null, now)).toBe('草稿');
  });

  test('chinese dates spell out the numerals', () => {
    expect(formatChineseDate(new Date(2026, 8, 26))).toBe('二〇二六年九月二十六日 · 星期六');
    expect(formatChineseDate(new Date(2025, 0, 10))).toBe('二〇二五年一月十日 · 星期五');
  });
});
