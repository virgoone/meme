import { createD1Database, importedPosts } from '@meme/db';
import { eq, or } from 'drizzle-orm';
import type { WorkerEnv } from '../../env';

const DEFAULT_REACTIONS = [0, 0, 0, 0] as const;

function reactionKey(id: string): string {
  return `reactions:${id}`;
}

function parseReactions(value: string | null): number[] {
  if (!value) return [...DEFAULT_REACTIONS];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_REACTIONS.length &&
      parsed.every((item) => Number.isInteger(item) && item >= 0)
    ) {
      return parsed;
    }
  } catch {
    return [...DEFAULT_REACTIONS];
  }
  return [...DEFAULT_REACTIONS];
}

async function readReactionState(env: WorkerEnv, id: string) {
  const [post] = await createD1Database(env.DB)
    .select({ id: importedPosts.id, sanityId: importedPosts.sanityId })
    .from(importedPosts)
    .where(or(eq(importedPosts.id, id), eq(importedPosts.sanityId, id)))
    .limit(1);
  const canonicalId = post?.id ?? id;
  const current = parseReactions(await env.MEME_KV.get(reactionKey(canonicalId)));
  const legacy = post && post.sanityId !== canonicalId
    ? parseReactions(await env.MEME_KV.get(reactionKey(post.sanityId)))
    : [...DEFAULT_REACTIONS];
  return { canonicalId, current, legacy };
}

export async function getReactions(env: WorkerEnv, id: string) {
  const { current, legacy } = await readReactionState(env, id);
  return current.map((count, index) => count + legacy[index]);
}

export async function incrementReaction(
  env: WorkerEnv,
  id: string,
  index: number,
) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= DEFAULT_REACTIONS.length
  ) {
    throw new Error('index must be between 0 and 3');
  }

  const { canonicalId, current, legacy } = await readReactionState(env, id);
  current[index] += 1;
  // Legacy counters stay immutable; only post-migration increments use the new ID.
  await env.MEME_KV.put(reactionKey(canonicalId), JSON.stringify(current));
  return current.map((count, reactionIndex) => count + legacy[reactionIndex]);
}
