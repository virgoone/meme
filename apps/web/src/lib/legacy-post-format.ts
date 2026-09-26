export type LegacyListFormat = { level: number; start?: number };

// Blocks retain their individual comment anchors while sharing list numbering.
export function legacyListFormats(values: unknown[]): Array<LegacyListFormat | undefined> {
  const levels = new Map<number, { kind: string; count: number }>();
  return values.map(value => {
    const block = value as { _type?: string; listItem?: string; level?: number } | null;
    const kind = block?.listItem;
    if (block?._type !== 'block' || (kind !== 'bullet' && kind !== 'number')) {
      levels.clear();
      return undefined;
    }
    const level = typeof block.level === 'number' && Number.isFinite(block.level) ? Math.max(1, Math.floor(block.level)) : 1;
    for (const key of levels.keys()) if (key > level) levels.delete(key);
    const previous = levels.get(level);
    const count = previous?.kind === kind ? previous.count + 1 : 1;
    levels.set(level, { kind, count });
    return { level, ...(kind === 'number' ? { start: count } : {}) };
  });
}

export function legacyCode(value: unknown, type?: string, plainText?: string | null): { code: string; language?: string } | undefined {
  const block = value as { _type?: string; code?: string; language?: string } | null;
  if (!['code', 'codeBlock'].includes(type ?? '') && !['code', 'codeBlock'].includes(block?._type ?? '')) return undefined;
  return {
    code: typeof block?.code === 'string' ? block.code : plainText ?? '',
    language: typeof block?.language === 'string' ? block.language : undefined,
  };
}
