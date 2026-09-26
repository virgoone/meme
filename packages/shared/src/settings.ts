import { ADSENSE_DEFAULTS } from './adsense';

/**
 * Settings schema — single source of truth shared by server (API) and web (admin UI).
 *
 * Every group maps to a form section on /admin/settings.
 * Every field maps to one key in the `settings` DB table.
 */

// ---- storage keys -----------------------------------------------------------------

export const STORAGE_SETTINGS_KEYS = [
  'UPLOAD_PROVIDER',
  'UPLOAD_BUCKET',
  'UPLOAD_REGION',
  'UPLOAD_ENDPOINT',
  'UPLOAD_ACCESS_KEY_ID',
  'UPLOAD_SECRET_ACCESS_KEY',
  'UPLOAD_URL_BASE',
  'UPLOAD_FORCE_PATH_STYLE',
] as const;

export const API_KEY_SETTINGS_KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_API_URL',
  'OPENAI_MODEL',
  'RESEND_API_KEY',
  'GA_MEASUREMENT_ID',
] as const;

// ---- field type ------------------------------------------------------------------

export interface SettingsField {
  key: string;
  label: string;
  description?: string;
  type: 'text' | 'url' | 'email' | 'password' | 'textarea' | 'switch' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  /** Appears in only these envs (omit = all envs). */
  envs?: ('dev' | 'prod')[];
}

export interface SettingsGroup {
  title: string;
  description?: string;
  fields: SettingsField[];
}

// ---- groups & fields -------------------------------------------------------------

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: '站点基础',
    description: '站点名称、描述和 SEO 相关配置。',
    fields: [
      { key: 'SITE_NAME', label: '站点名称', type: 'text', placeholder: 'Koya的个人博客' },
      { key: 'SITE_DESCRIPTION', label: '站点描述', type: 'textarea', placeholder: '小全栈，正在搬砖，啥都写点。' },
      { key: 'SITE_KEYWORDS', label: 'SEO 关键词', type: 'text', placeholder: 'blog,前端,技术' },
      { key: 'SITE_URL', label: '站点 URL', type: 'url', placeholder: 'https://example.com' },
      { key: 'SITE_LOGO_URL', label: 'Logo URL', type: 'url', placeholder: 'https://example.com/logo.png' },
      { key: 'SITE_FAVICON_URL', label: 'Favicon URL', type: 'url', placeholder: 'https://example.com/favicon.ico' },
      { key: 'SITE_ICP', label: 'ICP 备案号', type: 'text', placeholder: '京ICP备XXXXXXXX号' },
    ],
  },
  {
    title: '社交链接',
    description: '社交媒体和联系方式。',
    fields: [
      { key: 'SOCIAL_GITHUB', label: 'GitHub', type: 'url', placeholder: 'https://github.com/yourname' },
      { key: 'SOCIAL_TWITTER', label: 'X (Twitter)', type: 'url', placeholder: 'https://x.com/yourname' },
      { key: 'SOCIAL_EMAIL', label: '联系邮箱', type: 'email', placeholder: 'hello@example.com' },
      { key: 'SOCIAL_BILIBILI', label: 'Bilibili', type: 'url', placeholder: 'https://space.bilibili.com/xxx' },
      { key: 'SOCIAL_WECHAT', label: '微信公众号', type: 'text', placeholder: '公众号名称' },
    ],
  },
  {
    title: '邮件配置',
    description: 'SMTP / Resend 发件配置。',
    fields: [
      { key: 'EMAIL_FROM', label: '发件地址', type: 'email', placeholder: 'noreply@example.com' },
      { key: 'EMAIL_SMTP_HOST', label: 'SMTP Host', type: 'text', placeholder: 'smtp.resend.com' },
      { key: 'EMAIL_SMTP_PORT', label: 'SMTP Port', type: 'text', placeholder: '587' },
      { key: 'EMAIL_SMTP_USER', label: 'SMTP 用户名', type: 'text' },
      { key: 'EMAIL_SMTP_PASS', label: 'SMTP 密码', type: 'password' },
    ],
  },
  {
    title: '存储配置',
    description: '图片/文件上传的目标存储。',
    fields: [
      {
        key: 'UPLOAD_PROVIDER',
        label: '存储提供商',
        type: 'select',
        options: [
          { label: 'Cloudflare R2', value: 'cloudflare' },
          { label: 'AWS S3', value: 'aws' },
          { label: 'Backblaze B2', value: 'backblaze' },
          { label: 'DigitalOcean Spaces', value: 'digitalocean' },
          { label: 'MinIO', value: 'minio' },
          { label: 'Tigris', value: 'tigris' },
          { label: 'Wasabi', value: 'wasabi' },
          { label: '自定义 S3', value: 'custom' },
        ],
      },
      { key: 'UPLOAD_BUCKET', label: 'Bucket 名称', type: 'text', placeholder: 'meme-assets' },
      { key: 'UPLOAD_REGION', label: 'Region', type: 'text', placeholder: 'auto' },
      { key: 'UPLOAD_ENDPOINT', label: 'Endpoint URL', type: 'url', placeholder: 'https://<account>.r2.cloudflarestorage.com' },
      { key: 'UPLOAD_ACCESS_KEY_ID', label: 'Access Key ID', type: 'text' },
      { key: 'UPLOAD_SECRET_ACCESS_KEY', label: 'Secret Access Key', type: 'password' },
      { key: 'UPLOAD_URL_BASE', label: '自定义访问域名', type: 'url', placeholder: 'https://cdn.example.com' },
      { key: 'UPLOAD_FORCE_PATH_STYLE', label: 'Force Path Style', type: 'switch' },
    ],
  },
  {
    title: '广告与变现',
    description: '保留 AdSense 认证，控制公开页面的广告展示。',
    fields: [
      { key: 'ADSENSE_ENABLED', label: '启用广告', type: 'switch', description: '关闭后不再加载广告；账号认证标签和 ads.txt 继续保留。保存后刷新公开页面生效。' },
      { key: 'ADSENSE_CLIENT_ID', label: 'AdSense 发布商 ID', type: 'text', placeholder: 'ca-pub-3801577709600181', description: '用于账号认证、广告脚本与 ads.txt。' },
      { key: 'ADSENSE_SLOT_ID', label: '展示广告位 ID', type: 'text', placeholder: '2131063994', description: '沿用旧站的自适应展示广告位。不同页面目前共用此广告位。' },
      { key: 'ADSENSE_HOME_ENABLED', label: '首页', type: 'switch', description: '近期文章列表之后。' },
      { key: 'ADSENSE_BLOG_ENABLED', label: '博客列表', type: 'switch', description: '每页第 5 篇文章之后；不足 5 篇时放在列表末尾。' },
      { key: 'ADSENSE_ARTICLE_ENABLED', label: '文章详情', type: 'switch', description: '正文末尾，不插入段落、代码或表格之间。' },
      { key: 'ADSENSE_PROJECTS_ENABLED', label: '项目页', type: 'switch', description: '项目列表之后。' },
      { key: 'ADSENSE_GUESTBOOK_ENABLED', label: '留言墙', type: 'switch', description: '留言列表之后，与留言输入框分开。' },
    ],
  },
  {
    title: '第三方 API',
    description: 'AI、分析等服务密钥。',
    fields: [
      { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', type: 'password' },
      { key: 'OPENAI_API_URL', label: 'OpenAI API URL', type: 'url', placeholder: 'https://api.openai.com/v1' },
      { key: 'OPENAI_MODEL', label: 'OpenAI 模型', type: 'text', placeholder: 'gpt-4o' },
      { key: 'RESEND_API_KEY', label: 'Resend API Key', type: 'password' },
      { key: 'GA_MEASUREMENT_ID', label: 'Google Analytics ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    ],
  },
];

// ---- defaults --------------------------------------------------------------------

export const SETTINGS_DEFAULTS: Record<string, unknown> = {
  ...ADSENSE_DEFAULTS,
  UPLOAD_PROVIDER: 'cloudflare',
  UPLOAD_REGION: 'auto',
  UPLOAD_FORCE_PATH_STYLE: false,
  OPENAI_API_URL: 'https://api.openai.com/v1',
  OPENAI_MODEL: 'gpt-4o',
};

/** All known settings keys (flat list). */
export const ALL_SETTINGS_KEYS = SETTINGS_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
