export const AD_PLACEMENTS = ['home', 'blog', 'article', 'projects', 'guestbook'] as const;
export type AdPlacement = typeof AD_PLACEMENTS[number];
export type AdSenseConfig = {
  clientId: string | null;
  slotId: string | null;
  enabled: boolean;
  placements: Record<AdPlacement, boolean>;
};

// Recovered from the site's original ads.txt, layout and AdBanner component.
export const ADSENSE_DEFAULTS: Record<string, unknown> = {
  ADSENSE_CLIENT_ID: 'ca-pub-3801577709600181',
  ADSENSE_SLOT_ID: '2131063994',
  ADSENSE_ENABLED: true,
  ...Object.fromEntries(AD_PLACEMENTS.map(placement => [`ADSENSE_${placement.toUpperCase()}_ENABLED`, true])),
};
export const ADSENSE_SETTINGS_KEYS = Object.keys(ADSENSE_DEFAULTS);
const clientPattern = /^ca-pub-\d{16}$/;
const slotPattern = /^\d{1,20}$/;
const enabled = (value: unknown) => value === true || value === 'true';

export function resolveAdSenseConfig(values: Record<string, unknown>): AdSenseConfig {
  const settings = { ...ADSENSE_DEFAULTS, ...values };
  const client = String(settings.ADSENSE_CLIENT_ID ?? '').trim();
  const slot = String(settings.ADSENSE_SLOT_ID ?? '').trim();
  const clientId = clientPattern.test(client) ? client : null;
  const slotId = slotPattern.test(slot) ? slot : null;
  return {
    clientId, slotId,
    enabled: enabled(settings.ADSENSE_ENABLED) && !!clientId && !!slotId,
    placements: Object.fromEntries(AD_PLACEMENTS.map(placement => [placement, enabled(settings[`ADSENSE_${placement.toUpperCase()}_ENABLED`])])) as AdSenseConfig['placements'],
  };
}

export function validateAdSenseSettings(input: Record<string, unknown>): string | null {
  for (const key of ADSENSE_SETTINGS_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key.endsWith('_ENABLED')) {
      if (![true, false, 'true', 'false'].includes(value as boolean | string)) return '广告开关必须为开启或关闭';
    } else if (typeof value !== 'string' || (value.trim() !== '' && !(key === 'ADSENSE_CLIENT_ID' ? clientPattern : slotPattern).test(value.trim()))) {
      return key === 'ADSENSE_CLIENT_ID' ? 'AdSense 发布商 ID 格式应为 ca-pub- 加 16 位数字' : 'AdSense 广告位 ID 只能包含数字';
    }
  }
  return null;
}

export function adsTxt(config: AdSenseConfig): string | null {
  return config.clientId ? `google.com, ${config.clientId.slice(3)}, DIRECT, f08c47fec0942fa0\n` : null;
}
