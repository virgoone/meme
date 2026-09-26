export const newsletterTemplates = [
  { id: 'digest', name: '简洁清单', description: '标题与摘要，轻松扫读' },
  { id: 'visual', name: '图文摘要', description: '文章封面，更直观地展示更新' },
  { id: 'featured', name: '重点推荐', description: '首篇突出，其余紧凑排列' },
] as const;

export type NewsletterTemplate = (typeof newsletterTemplates)[number]['id'];
export type DigestPost = {
  id: string;
  title: string;
  description: string;
  slug: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
};
export type NewsletterDraft = {
  version: 1;
  subject: string;
  headline: string;
  introduction: string;
  template: NewsletterTemplate;
  includeDescriptions: boolean;
  posts: DigestPost[];
};
export type NewsletterCampaign = {
  id: string;
  newsletterId: number;
  status: 'draft' | 'sending' | 'sent';
  draft: NewsletterDraft;
  accepted: number;
  skipped: number;
  remaining: number;
  total: number;
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );

function httpUrl(value: string | null, origin: string) {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    // Common email clients do not display SVG images; use the raster exports.
    if (url.pathname.endsWith('.svg')) {
      const filename = url.pathname
        .split('/')
        .at(-1)
        ?.replace(/\.svg$/, '.png');
      if (
        filename &&
        [
          'fluxship-cloudflare-cover-1200x630.png',
          'bunship-provider-cover-1200x630.png',
          'bunship-workflow-cover-1200x630.png',
          'tr3000-device-card.png',
        ].includes(filename)
      )
        return new URL(`/newsletter-covers/${filename}`, origin).href;
      return null;
    }
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** The preview and delivered email use this same table-based, inline-style markup. */
export function renderNewsletter(
  draft: NewsletterDraft,
  options: {
    siteUrl: string;
    unsubscribeUrl?: string;
  },
) {
  const site = options.siteUrl.replace(/\/$/, '');
  const isFeatured = draft.template === 'featured';
  const posts = draft.posts
    .map((post, index) => {
      const featured = isFeatured && index === 0;
      const image = httpUrl(post.coverImageUrl, site);
      const url = `${site}/${encodeURIComponent(post.slug)}`;
      const showImage = image && (draft.template === 'visual' || featured);
      const date = post.publishedAt?.slice(0, 10) ?? '';
      return `<tr><td style="padding:26px 0;${index ? 'border-top:1px solid #e5e7eb;' : ''}">
      ${showImage ? `<a href="${escapeHtml(url)}"><img src="${escapeHtml(image)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px;margin:0 0 18px"></a>` : ''}
      <p style="margin:0 0 8px;color:#626875;font-size:12px;line-height:1.5">${featured ? '本期推荐 · ' : ''}${escapeHtml(date)}</p>
      <h2 style="margin:0 0 10px;font-size:${featured ? 26 : 21}px;line-height:1.5;font-weight:700;overflow-wrap:anywhere"><a href="${escapeHtml(url)}" style="color:#17221b;text-decoration:none">${escapeHtml(post.title)}</a></h2>
      ${draft.includeDescriptions && post.description ? `<p style="margin:0 0 14px;color:#4c535b;font-size:15px;line-height:1.85;overflow-wrap:anywhere">${escapeHtml(post.description).replace(/\n/g, '<br>')}</p>` : ''}
      <a href="${escapeHtml(url)}" style="display:inline-block;color:#3d661e;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:4px">阅读全文 →</a>
    </td></tr>`;
    })
    .join('');
  const footer = options.unsubscribeUrl
    ? `<a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#626875;text-decoration:underline">取消订阅</a>`
    : '取消订阅（发送时自动附上专属链接）';
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(draft.subject)}</title></head>
  <body style="margin:0;padding:0;background:#f3f4f5;color:#17221b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(draft.introduction || draft.posts[0]?.description || draft.headline)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f5"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-collapse:collapse">
      <tr><td style="padding:28px 24px 22px;${isFeatured ? 'background:#17251d;color:#ffffff;' : 'border-bottom:1px solid #e5e7eb;'}">
        <a href="${escapeHtml(site)}" style="color:${isFeatured ? '#bded75' : '#3d661e'};font-size:14px;font-weight:700;text-decoration:none">Koya 的博客</a>
        <h1 style="margin:22px 0 12px;font-size:26px;line-height:1.5;text-wrap:balance;font-weight:700;overflow-wrap:anywhere">${escapeHtml(draft.headline)}</h1>
        <p style="margin:0;color:${isFeatured ? '#d1ddd3' : '#4c535b'};font-size:15px;line-height:1.85;overflow-wrap:anywhere">${escapeHtml(draft.introduction).replace(/\n/g, '<br>')}</p>
      </td></tr>
      <tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${posts || '<tr><td style="padding:36px 0;color:#626875">在左侧选择文章，预览会出现在这里。</td></tr>'}</table></td></tr>
      <tr><td style="padding:24px;border-top:1px solid #e5e7eb;color:#626875;font-size:12px;line-height:1.8">你收到这封邮件，是因为订阅了Koya 的博客。<br><a href="${escapeHtml(site)}/blog" style="color:#3d661e;text-decoration:underline">浏览全部文章</a> · ${footer}</td></tr>
    </table></td></tr></table>
  </body></html>`;
  const text = [
    draft.headline,
    draft.introduction,
    ...draft.posts.map((post) =>
      [
        post.title,
        draft.includeDescriptions ? post.description : '',
        `${site}/${encodeURIComponent(post.slug)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    `浏览全部文章：${site}/blog`,
    options.unsubscribeUrl ? `取消订阅：${options.unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return { html, text };
}

export function parseNewsletterDraft(
  value: string | null,
): NewsletterDraft | null {
  try {
    const parsed = JSON.parse(value ?? '');
    return parsed.version === 1 &&
      Array.isArray(parsed.posts) &&
      newsletterTemplates.some((t) => t.id === parsed.template)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
