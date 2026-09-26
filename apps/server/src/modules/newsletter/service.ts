import { createD1Database, newsletters, subscribers } from '@meme/db';
import { desc, eq, sql } from 'drizzle-orm';

import type { WorkerEnv } from '../../env';

export type NewsletterInput = {
  data?: {
    email?: string;
  };
  email?: string;
};

export type NewsletterDetail = {
  id: number;
  subject: string | null;
  body: string | null;
  sentAt: Date | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function listNewsletters(env: WorkerEnv, limit = 100) {
  const db = createD1Database(env.DB);

  return db
    .select({
      campaignId: sql<string | null>`(select c.id from newsletter_campaigns c where c.newsletter_id = newsletters.id)`,
      campaignStatus: sql<string | null>`(select c.status from newsletter_campaigns c where c.newsletter_id = newsletters.id)`,
      id: newsletters.id,
      subject: newsletters.subject,
      body: newsletters.body,
      sentAt: newsletters.sentAt,
      createdAt: newsletters.createdAt,
      updatedAt: newsletters.updatedAt,
    })
    .from(newsletters)
    .orderBy(desc(newsletters.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function listSubscribers(env: WorkerEnv, limit = 100) {
  const db = createD1Database(env.DB);

  return db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      subscribedAt: subscribers.subscribedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      updatedAt: subscribers.updatedAt,
    })
    .from(subscribers)
    .orderBy(desc(subscribers.id))
    .limit(Math.min(Math.max(limit, 1), 500));
}

function normalizeEmail(input: NewsletterInput): string {
  const email = (input.data?.email ?? input.email)?.trim().toLowerCase();
  if (!email) throw new Error('email is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('email is invalid');
  }
  return email;
}

export async function subscribeToNewsletter(
  env: WorkerEnv,
  input: NewsletterInput,
) {
  const email = normalizeEmail(input);
  const db = createD1Database(env.DB);
  const [existing] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing) {
    return {
      status: 'success',
      subscriberId: existing.id,
      alreadySubscribed: true,
    };
  }

  const [created] = await db
    .insert(subscribers)
    .values({
      email,
      token: crypto.randomUUID(),
    })
    .returning();

  return {
    status: 'success',
    subscriberId: created.id,
    alreadySubscribed: false,
  };
}

export async function confirmNewsletterToken(env: WorkerEnv, token: string) {
  if (!token.trim()) throw new Error('token is required');

  const db = createD1Database(env.DB);
  const [subscriber] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.token, token))
    .limit(1);

  if (!subscriber || subscriber.subscribedAt) return null;

  const [updated] = await db
    .update(subscribers)
    .set({
      subscribedAt: new Date(),
      token: null,
    })
    .where(eq(subscribers.id, subscriber.id))
    .returning();

  return updated ?? null;
}

export async function getNewsletterById(
  env: WorkerEnv,
  id: number,
): Promise<NewsletterDetail | null> {
  if (!Number.isInteger(id) || id <= 0) return null;

  const db = createD1Database(env.DB);
  const [newsletter] = await db
    .select({
      id: newsletters.id,
      subject: newsletters.subject,
      body: newsletters.body,
      sentAt: newsletters.sentAt,
      createdAt: newsletters.createdAt,
      updatedAt: newsletters.updatedAt,
    })
    .from(newsletters)
    .where(eq(newsletters.id, id))
    .limit(1);

  // Saved campaign drafts must never be exposed by the public newsletter URL.
  if (newsletter && !newsletter.sentAt) {
    const campaign = await env.DB.prepare('SELECT id FROM newsletter_campaigns WHERE newsletter_id = ?').bind(id).first();
    if (campaign) return null;
  }
  return newsletter ?? null;
}
