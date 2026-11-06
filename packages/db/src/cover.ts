/** Run on save/import only. Public lists never read article blocks for covers. */
export function resolvePostCover(mainImageUrl: string | null | undefined, portableBlocks: unknown[]): string | null {
  return normalizeStoredImageUrl(mainImageUrl) ?? portableBlocks.map(sanityImageUrl).find(Boolean) ?? null;
}

export function normalizeStoredImageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return !trimmed || trimmed === 'main_image_url' ? null : trimmed;
}

function sanityImageUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const asset = (value as { asset?: { _ref?: unknown; url?: unknown } }).asset;
  const directUrl = typeof asset?.url === 'string' ? asset.url.trim()
    : typeof (value as { url?: unknown }).url === 'string' ? String((value as { url?: unknown }).url).trim() : '';
  if (directUrl) return directUrl;
  const ref = typeof asset?._ref === 'string' ? asset._ref
    : typeof (value as { _ref?: unknown })._ref === 'string' ? String((value as { _ref?: unknown })._ref) : null;
  const match = ref?.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i);
  return match ? `https://cdn.sanity.io/images/gynhwdlh/production/${match[1]}-${match[2]}.${match[3]}` : null;
}
