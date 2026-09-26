import {
  newsletterTemplates,
  parseNewsletterDraft,
  renderNewsletter,
  type NewsletterCampaign,
  type NewsletterDraft,
} from '@meme/shared';
import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';
import { listImportedPosts } from '../posts/service';

type CampaignRow = {
  id: string;
  newsletter_id: number;
  status: NewsletterCampaign['status'];
  body: string;
  lease_id: string | null;
};
type Delivery = {
  subscriber_id: number;
  email: string;
  unsubscribe_token: string;
  payload: string | null;
  attempted_at: number | null;
};
export type CampaignInput = Omit<NewsletterDraft, 'posts'> & {
  posts: { id: string; title: string; description: string }[];
};
const active =
  "subscribed_at IS NOT NULL AND (unsubscribed_at IS NULL OR unsubscribed_at = '') AND email IS NOT NULL AND trim(email) <> ''";
const eligible = `SELECT MIN(id) AS id, lower(trim(email)) AS email FROM subscribers WHERE ${active} GROUP BY lower(trim(email))`;
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function newsletterOptions(env: WorkerEnv) {
  const row = await env.DB.prepare(
    `SELECT count(*) AS total FROM (${eligible})`,
  ).first<{ total: number }>();
  return {
    recipients: row?.total ?? 0,
    ready: Boolean(env.RESEND_API_KEY?.trim() && env.EMAIL_FROM?.trim()),
    from: env.EMAIL_FROM ?? '',
    siteUrl: env.SITE_URL ?? 'https://blog.douni.one',
  };
}

export async function getCampaign(
  env: WorkerEnv,
  id: string,
): Promise<NewsletterCampaign> {
  const row = await env.DB.prepare(
    'SELECT c.*, n.body FROM newsletter_campaigns c JOIN newsletters n ON n.id = c.newsletter_id WHERE c.id = ?',
  )
    .bind(id)
    .first<CampaignRow>();
  if (!row) throw AppError.notFound('邮件草稿不存在');
  const draft = parseNewsletterDraft(row.body);
  if (!draft) throw AppError.badRequest('邮件内容格式无效');
  const counts = await env.DB.prepare(
    "SELECT count(*) AS total, coalesce(sum(status = 'accepted'), 0) AS accepted, coalesce(sum(status = 'skipped'), 0) AS skipped, coalesce(sum(status = 'pending'), 0) AS remaining FROM newsletter_deliveries WHERE campaign_id = ?",
  )
    .bind(id)
    .first<{
      total: number;
      accepted: number;
      skipped: number;
      remaining: number;
    }>();
  return {
    id,
    newsletterId: row.newsletter_id,
    status: row.status,
    draft,
    total: counts?.total ?? 0,
    accepted: counts?.accepted ?? 0,
    skipped: counts?.skipped ?? 0,
    remaining: counts?.remaining ?? 0,
  };
}

export async function saveCampaign(
  env: WorkerEnv,
  id: string,
  input: CampaignInput,
) {
  if (!validId(id)) throw AppError.badRequest('草稿编号无效');
  const posts = await listImportedPosts(env, { limit: 100 });
  if (
    !input.subject.trim() ||
    !input.headline.trim() ||
    !input.posts.length ||
    new Set(input.posts.map((post) => post.id)).size !== input.posts.length ||
    !newsletterTemplates.some((t) => t.id === input.template)
  )
    throw AppError.badRequest('请填写邮件主题、标题，并选择文章');
  const draft: NewsletterDraft = {
    ...input,
    version: 1,
    subject: input.subject.trim(),
    headline: input.headline.trim(),
    posts: input.posts.map((selected) => {
      const post = posts.find(
        (post) =>
          post.id === selected.id &&
          post.publishedAt &&
          new Date(post.publishedAt).getTime() <= Date.now(),
      );
      if (!post)
        throw AppError.badRequest('所选文章尚未发布或已下线，请重新选择');
      if (!selected.title.trim()) throw AppError.badRequest('文章标题不能为空');
      return {
        id: post.id,
        title: selected.title.trim(),
        description: selected.description.trim(),
        slug: post.slug,
        coverImageUrl: post.coverImageUrl,
        publishedAt: post.publishedAt,
      };
    }),
  };
  const body = JSON.stringify(draft);
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO newsletters (subject, body) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM newsletter_campaigns WHERE id = ?)',
    ).bind(draft.subject, body, id),
    env.DB.prepare(
      'INSERT INTO newsletter_campaigns (id, newsletter_id) SELECT ?, last_insert_rowid() WHERE NOT EXISTS (SELECT 1 FROM newsletter_campaigns WHERE id = ?)',
    ).bind(id, id),
    env.DB.prepare(
      "UPDATE newsletters SET subject = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT newsletter_id FROM newsletter_campaigns WHERE id = ? AND status = 'draft' AND lease_until < ?)",
    ).bind(draft.subject, body, id, Date.now()),
  ]);
  const campaign = await getCampaign(env, id);
  if (campaign.status !== 'draft')
    throw AppError.badRequest('这封邮件已经开始发送，内容已锁定');
  if (JSON.stringify(campaign.draft) !== body)
    throw new AppError('邮件正在处理中，请稍后重试', 409);
  return campaign;
}

function sender(env: WorkerEnv) {
  if (!env.RESEND_API_KEY?.trim() || !env.EMAIL_FROM?.trim())
    throw AppError.badRequest('请先配置邮件服务和发件地址');
  return env.EMAIL_FROM.trim();
}

async function deliver(env: WorkerEnv, payload: string, key: string) {
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        'Idempotency-Key': key,
      },
      body: payload,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new AppError('邮件服务响应超时，进度已保留，可稍后继续发送。', 502);
  }
  const result = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !result.id)
    throw new AppError(
      `邮件服务未接受本次发送：${result.message ?? response.status}。进度已保留。`,
      502,
    );
  return result.id;
}

export async function testCampaign(
  env: WorkerEnv,
  id: string,
  email: string,
  attemptId: string,
) {
  const from = sender(env);
  const campaign = await getCampaign(env, id);
  const content = renderNewsletter(campaign.draft, {
    siteUrl: env.SITE_URL ?? 'https://blog.douni.one',
  });
  await deliver(
    env,
    JSON.stringify({
      from,
      to: [email],
      subject: `[预览] ${campaign.draft.subject}`,
      ...content,
    }),
    `newsletter-test/${id}/${attemptId}`,
  );
  return { message: '测试邮件已提交，请检查当前登录账号的邮箱。' };
}

/** One durable delivery per request; the admin can resume without replaying accepted recipients. */
export async function sendCampaignStep(
  env: WorkerEnv,
  id: string,
  expectedRecipients: number,
) {
  const from = sender(env);
  const leaseId = crypto.randomUUID();
  const lock = await env.DB.prepare(
    "UPDATE newsletter_campaigns SET lease_id = ?, lease_until = ? WHERE id = ? AND lease_until < ? AND status <> 'sent' RETURNING id",
  )
    .bind(leaseId, Date.now() + 120_000, id, Date.now())
    .first();
  if (!lock) {
    const current = await getCampaign(env, id);
    if (current.status === 'sent') return current;
    throw new AppError('这封邮件正在发送中，请稍后查看进度。', 409);
  }
  try {
    let campaign = await getCampaign(env, id);
    if (campaign.status === 'draft') {
      const { recipients } = await newsletterOptions(env);
      if (!recipients) throw AppError.badRequest('还没有已确认订阅的用户');
      if (recipients !== expectedRecipients)
        throw new AppError('订阅人数已变化，请刷新后重新确认发送范围。', 409);
      // D1 batch is atomic: freeze the audience and lock the content together.
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO newsletter_deliveries (campaign_id, subscriber_id, email, unsubscribe_token) SELECT ?, id, email, lower(hex(randomblob(24))) FROM (${eligible}) WHERE (SELECT count(*) FROM (${eligible})) = ?`,
        ).bind(id, expectedRecipients),
        env.DB.prepare(
          "UPDATE newsletter_campaigns SET status = 'sending' WHERE id = ? AND (SELECT count(*) FROM newsletter_deliveries WHERE campaign_id = ?) = ?",
        ).bind(id, id, expectedRecipients),
      ]);
      campaign = await getCampaign(env, id);
      if (campaign.status === 'draft')
        throw new AppError('订阅人数已变化，请刷新后重新确认发送范围。', 409);
    }
    const delivery = await env.DB.prepare(
      "SELECT * FROM newsletter_deliveries WHERE campaign_id = ? AND status = 'pending' ORDER BY subscriber_id LIMIT 1",
    )
      .bind(id)
      .first<Delivery>();
    if (delivery) {
      const stillSubscribed = await env.DB.prepare(
        `SELECT id FROM subscribers WHERE id = ? AND lower(trim(email)) = ? AND ${active}`,
      )
        .bind(delivery.subscriber_id, delivery.email)
        .first();
      if (
        !stillSubscribed ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(delivery.email)
      ) {
        await env.DB.prepare(
          "UPDATE newsletter_deliveries SET status = 'skipped' WHERE campaign_id = ? AND subscriber_id = ?",
        )
          .bind(id, delivery.subscriber_id)
          .run();
      } else {
        // Resend retains idempotency for 24h. Never blindly replay an ambiguous older attempt.
        if (
          delivery.attempted_at &&
          Date.now() - delivery.attempted_at > 23 * 60 * 60 * 1000
        )
          throw AppError.badRequest(
            '上次发送结果超过可安全重试的时限，请先在邮件服务后台核对该邮件，避免重复发送。',
          );
        let payload = delivery.payload;
        if (!payload) {
          const siteUrl = env.SITE_URL ?? 'https://blog.douni.one';
          const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/api/newsletter/unsubscribe/${delivery.unsubscribe_token}`;
          payload = JSON.stringify({
            from,
            to: [delivery.email],
            subject: campaign.draft.subject,
            ...renderNewsletter(campaign.draft, { siteUrl, unsubscribeUrl }),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });
          await env.DB.prepare(
            'UPDATE newsletter_deliveries SET payload = ?, attempted_at = ? WHERE campaign_id = ? AND subscriber_id = ?',
          )
            .bind(payload, Date.now(), id, delivery.subscriber_id)
            .run();
        }
        const providerId = await deliver(
          env,
          payload,
          `newsletter/${id}/${delivery.subscriber_id}`,
        );
        await env.DB.prepare(
          "UPDATE newsletter_deliveries SET status = 'accepted', provider_id = ? WHERE campaign_id = ? AND subscriber_id = ?",
        )
          .bind(providerId, id, delivery.subscriber_id)
          .run();
      }
    }
    const progress = await getCampaign(env, id);
    if (!progress.remaining) {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE newsletter_campaigns SET status = 'sent' WHERE id = ?",
        ).bind(id),
        env.DB.prepare(
          'UPDATE newsletters SET sent_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ).bind(Math.floor(Date.now() / 1000), campaign.newsletterId),
      ]);
    }
    return getCampaign(env, id);
  } finally {
    await env.DB.prepare(
      'UPDATE newsletter_campaigns SET lease_id = NULL, lease_until = 0 WHERE id = ? AND lease_id = ?',
    )
      .bind(id, leaseId)
      .run();
  }
}

export async function unsubscribeNewsletter(
  env: WorkerEnv,
  token: string,
  confirm: boolean,
) {
  if (!/^[0-9a-f]{48}$/.test(token)) throw AppError.notFound('退订链接无效');
  const delivery = await env.DB.prepare(
    'SELECT email FROM newsletter_deliveries WHERE unsubscribe_token = ?',
  )
    .bind(token)
    .first<{ email: string }>();
  if (!delivery) throw AppError.notFound('退订链接无效');
  if (confirm)
    await env.DB.prepare(
      'UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE lower(trim(email)) = ?',
    )
      .bind(delivery.email)
      .run();
  return new Response(
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>博客邮件订阅</title><body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:24px;line-height:1.8"><h1>${confirm ? '已取消订阅' : '取消邮件订阅'}</h1><p>${confirm ? '你不会再收到博客更新邮件。感谢你曾经的关注。' : '确认后，你将不再收到博客更新邮件。'}</p>${confirm ? '' : '<form method="post"><button style="padding:12px 20px;font-size:16px" type="submit">确认取消订阅</button></form>'}</body></html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'content-security-policy':
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
        'referrer-policy': 'no-referrer',
      },
    },
  );
}
