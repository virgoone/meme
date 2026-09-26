import { createFileRoute } from '@tanstack/react-router';
import { TermsPage } from '../lib/site-info';
import { infoPageHead } from '../lib/seo';

export const Route = createFileRoute('/terms')({
  head: () => infoPageHead('使用条款', 'Koya 个人博客的内容引用、技术实践、评论留言与反馈说明。', '/terms'),
  component: TermsPage,
});
