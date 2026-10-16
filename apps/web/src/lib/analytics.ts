import { createTracker, type Tracker } from '@evumi/tracker';
import { isPrivateAnalyticsPath } from './analytics-path';
import { siteUrl } from './seo';

const tracker = createTracker({
  domain: 'blog.douni.one',
  apiHost: 'https://evumi.bunship.site',
  identity: 'cookieless',
  captureReferrer: canCaptureReferrer(),
  outboundLinks: false,
  fileDownloads: false,
  formSubmissions: false,
  includeSearchParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'page'],
});

function canCaptureReferrer() {
  if (typeof document === 'undefined' || !document.referrer) return true;
  try { return !isPrivateAnalyticsPath(new URL(document.referrer).pathname); }
  catch { return false; }
}

function canTrack() {
  return typeof window !== 'undefined'
    && window.location.origin === siteUrl
    && !isPrivateAnalyticsPath(window.location.pathname);
}

let excludedNavigations = 0;

export const analytics: Tracker = {
  pageview(options) {
    if (!canTrack()) {
      excludedNavigations++;
      return Promise.resolve({ status: 'skipped' });
    }
    return tracker.pageview({
      ...options,
      // Returning from an excluded route can reuse an earlier history key.
      navigationId: `${excludedNavigations}:${options?.navigationId ?? window.location.href.split('#')[0]}`,
      // Published article slugs are public URLs; retain per-article reporting.
      routeTemplate: options?.routeTemplate === '/$slug' ? undefined : options?.routeTemplate,
    });
  },
  track(name, options) {
    if (!canTrack()) return Promise.resolve({ status: 'skipped' });
    return tracker.track(name, options);
  },
};
