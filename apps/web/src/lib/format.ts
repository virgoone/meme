export function formatDate(value: string | null) {
  if (!value) return '未发布';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

/** `09-25` inside the current year, `2025-08-11` otherwise. Used in list rows. */
export function formatDateCompact(value: string | null, now = new Date()) {
  if (!value) return '草稿';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (date.getFullYear() === now.getFullYear()) return `${month}-${day}`;
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getYear(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

const CN_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CN_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function cnNumber(value: number) {
  if (value <= 10) return value === 10 ? '十' : CN_DIGITS[value];
  if (value < 20) return `十${CN_DIGITS[value % 10]}`;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${CN_DIGITS[tens]}十${ones ? CN_DIGITS[ones] : ''}`;
}

/** `二〇二六年九月二十六日 · 星期六` */
export function formatChineseDate(date = new Date()) {
  const year = String(date.getFullYear()).split('').map((d) => CN_DIGITS[Number(d)]).join('');
  return `${year}年${cnNumber(date.getMonth() + 1)}月${cnNumber(date.getDate())}日 · 星期${CN_WEEKDAYS[date.getDay()]}`;
}

export function greetingForHour(hour: number) {
  if (hour < 5) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 13) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function moodLabel(mood: 'happy' | 'sad' | 'neutral' | null) {
  if (mood === 'happy') return '开心';
  if (mood === 'sad') return '低落';
  return '日常';
}

export function moodEmoji(mood: 'happy' | 'sad' | 'neutral' | null) {
  if (mood === 'happy') return '😄';
  if (mood === 'sad') return '😢';
  return '📝';
}
