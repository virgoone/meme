export function formatDate(value: string | null) {
  if (!value) return '未发布';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
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
