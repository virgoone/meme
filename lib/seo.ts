export const seo = {
  title: '前端开发',
  description: 'Koya的个人博客',
  url: new URL(
    process.env.NODE_ENV === 'production'
      ? 'https://blog.douni.one'
      : 'http://localhost:3000',
  ),
} as const
