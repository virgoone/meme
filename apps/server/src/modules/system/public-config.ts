import { createD1Database, settings } from '@meme/db';
import { inArray } from 'drizzle-orm';
import type { WorkerEnv } from '../../env';
import { ADSENSE_SETTINGS_KEYS, resolveAdSenseConfig } from '@meme/shared';

export async function getPublicConfig(env: WorkerEnv) {
  const rows = await createD1Database(env.DB).select().from(settings)
    .where(inArray(settings.key, ['GA_MEASUREMENT_ID', 'GOOGLE_SITE_VERIFICATION', ...ADSENSE_SETTINGS_KEYS]));
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
  const ga = String(values.GA_MEASUREMENT_ID ?? '');
  const verification = String(values.GOOGLE_SITE_VERIFICATION ?? '');
  const adsense = resolveAdSenseConfig(values);
  return {
    adsense: { ...adsense, enabled: env.APP_ENV === 'production' && adsense.enabled },
    gaMeasurementId: /^G-[A-Z0-9]+$/.test(ga) ? ga : null,
    googleSiteVerification: /^[a-zA-Z0-9_-]{10,200}$/.test(verification) ? verification : null,
    // Retained for already-open clients; new clients always use the same origin.
    analyticsOrigin: null,
  };
}
