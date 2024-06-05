export const seo = {
  title: `Koya's 个人博客`,
  description: `Koya's 个人博客，一些个人随笔，技术总结，生活感悟`,
  url: new URL(
    process.env.NODE_ENV === 'production'
      ? 'https://blog.douni.one'
      : 'http://localhost:3000',
  ),
} as const
