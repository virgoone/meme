import { createFileRoute } from '@tanstack/react-router';
import { ContactPage } from '../lib/site-info';
import { infoPageHead } from '../lib/seo';

export const Route = createFileRoute('/contact')({
  head: () => infoPageHead('联系我', '联系 Koya：文章勘误、技术交流、账号与隐私请求，以及 GitHub 和 X 上的公开资料。', '/contact', 'ContactPage'),
  component: ContactPage,
});
