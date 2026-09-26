/** Public identity already used by the homepage and social redirects. */
export const siteIdentity = {
  url: 'https://blog.douni.one',
  name: "Koya's 个人博客",
  description: '小全栈的开发记录：Cloudflare、AI 应用、SaaS 架构与远程开发。从真实项目出发，分享设计取舍、代码实践和踩坑经验。',
  author: 'Koya',
  email: 'w2008second@gmail.com',
  profiles: ['https://github.com/virgoone', 'https://x.com/koyaguo'],
} as const;

export const siteInfoLinks = [
  { path: '/about', label: '关于我', description: '作者 Koya、博客主题与内容来源' },
  { path: '/contact', label: '联系我', description: '问题反馈、内容勘误与联系邮箱' },
  { path: '/privacy', label: '隐私政策', description: '账号、评论、统计、广告与 Cookie 的使用说明' },
  { path: '/terms', label: '使用条款', description: '内容引用、留言与站点使用说明' },
] as const;
