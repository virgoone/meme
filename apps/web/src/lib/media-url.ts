// Only old Meme media routes address the original R2 bucket. Preserve the key,
// query and fragment, and leave new upload URLs and third-party images intact.
const legacyRoute = /^(?:https:\/\/(?:blog\.douni\.one|meme\.moss-dev\.workers\.dev))?\/api\/media\/object\/(?=[^/?#])/i;

export function displayImageUrl(src: string, legacyBase = import.meta.env.VITE_LEGACY_MEDIA_URL_BASE): string {
  return legacyBase ? src.replace(legacyRoute, `${legacyBase.replace(/\/+$/, '')}/`) : src;
}
