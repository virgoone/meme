/**
 * Migrate user emails from Clerk into the Better Auth `ba_user` table.
 *
 * - Uses CLERK_SECRET_KEY (from .env.local / env) to list all Clerk users.
 * - Emits idempotent `INSERT OR IGNORE` SQL. The ba_user id reuses the Clerk
 *   user id so existing comments (comments.user_id = clerk id) stay owned by
 *   the migrated account after they sign in via email OTP.
 * - emailVerified = 1 (already verified by Clerk). role = admin when the email
 *   is in ADMIN_EMAILS.
 *
 * Usage:
 *   bun scripts/migrate-clerk-emails.ts > scripts/clerk-users.sql
 *   bunx wrangler d1 execute meme-prod --local  --file scripts/clerk-users.sql --config wrangler.dev.jsonc
 *   bunx wrangler d1 execute meme-prod --remote --file scripts/clerk-users.sql --config wrangler.jsonc
 */

const CLERK_SECRET = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET) {
  console.error('CLERK_SECRET_KEY is required (set it in .env.local).');
  process.exit(1);
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

type ClerkEmail = { id: string; email_address: string };
type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmail[];
};

async function fetchAllUsers(): Promise<ClerkUser[]> {
  const users: ClerkUser[] = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}&order_by=created_at`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET}` } },
    );
    if (!res.ok) {
      console.error(`Clerk API error ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const batch = (await res.json()) as ClerkUser[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    users.push(...batch);
    offset += batch.length;
    if (batch.length < limit) break;
  }
  return users;
}

function sql(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function primaryEmail(user: ClerkUser): string | null {
  const list = user.email_addresses ?? [];
  const primary =
    list.find((e) => e.id === user.primary_email_address_id) ?? list[0];
  return primary?.email_address?.trim().toLowerCase() ?? null;
}

const users = await fetchAllUsers();
const now = Date.now();
const rows: string[] = [];
let skipped = 0;

for (const user of users) {
  const email = primaryEmail(user);
  if (!email) {
    skipped += 1;
    continue;
  }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    email.split('@')[0];
  const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
  rows.push(
    `INSERT OR IGNORE INTO ba_user (id, name, email, email_verified, image, role, created_at, updated_at) VALUES (${sql(user.id)}, ${sql(name)}, ${sql(email)}, 1, ${sql(user.image_url ?? null)}, ${sql(role)}, ${now}, ${now});`,
  );
}

console.error(`Clerk users: ${users.length}, emitted: ${rows.length}, skipped: ${skipped}`);
console.log(rows.join('\n'));
