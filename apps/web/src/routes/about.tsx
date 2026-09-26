import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '../lib/site-info';
import { infoPageHead } from '../lib/seo';

export const Route = createFileRoute('/about')({
  head: () => infoPageHead('关于我', '我是 Koya，一个喜欢把想法做成产品的小全栈。在这里记录 Cloudflare、AI 应用、SaaS 与真实项目里的设计取舍。', '/about', 'AboutPage'),
  component: AboutPage,
});
