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

export async function getReactions(env: WorkerEnv, id: string) {
  return parseReactions(await env.MEME_KV.get(reactionKey(id)));
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

  const current = await getReactions(env, id);
  current[index] += 1;
  await env.MEME_KV.put(reactionKey(id), JSON.stringify(current));
  return current;
}
