import { createFileRoute } from '@tanstack/react-router';
import { PrivacyPage } from '../lib/site-info';
import { infoPageHead } from '../lib/seo';

export const Route = createFileRoute('/privacy')({
  head: () => infoPageHead('隐私政策', '了解博客如何处理登录、评论、邮件订阅、访问统计、Google Analytics、AdSense 广告和 Cookie。', '/privacy'),
  component: PrivacyPage,
});
