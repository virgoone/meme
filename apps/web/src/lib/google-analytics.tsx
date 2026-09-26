import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { siteUrl } from './seo';
import { normalizePage } from '@meme/shared';

export const isPrivateAnalyticsPath = (path: string) => /^\/(admin|login|confirm|newsletters)(\/|$)/.test(path);

/** Manual page views. Keep enhanced history measurement OFF in this GA stream. */
export function GoogleAnalytics({ measurementId }: { measurementId: string | null }) {
  const pathname = useRouterState({ select: state => state.resolvedLocation?.pathname });
  const archivePage = useRouterState({ select: state => state.resolvedLocation?.pathname === '/blog' ? normalizePage(state.resolvedLocation.search.page) : 1 });
  const status = useRouterState({ select: state => state.status });
  const previousPage = useRef<string | null>(null);
  useEffect(() => {
    if (!measurementId || !pathname || status !== 'idle' || window.location.origin !== siteUrl) return;
    const analyticsWindow = window as unknown as Record<string, unknown>;
    const disableKey = `ga-disable-${measurementId}`;
    const privatePage = isPrivateAnalyticsPath(pathname);
    analyticsWindow[disableKey] = privatePage;
    if (privatePage) { previousPage.current = null; return; }
    analyticsWindow.dataLayer ??= [];
    const queue = analyticsWindow.dataLayer as unknown[];
    function gtag(..._args: unknown[]) { queue.push(arguments); }
    if (!document.getElementById('google-analytics')) {
      analyticsWindow.gtag = gtag;
      gtag('js', new Date());
      gtag('config', measurementId, { send_page_view: false });
      const script = document.createElement('script');
      script.id = 'google-analytics';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
    }
    const page = `${siteUrl}${pathname}${archivePage > 1 ? `?page=${archivePage}` : ''}`;
    if (previousPage.current === page) return;
    let referrer = previousPage.current || '';
    if (!referrer && document.referrer) {
      try { const url = new URL(document.referrer); referrer = `${url.origin}${url.pathname}`; } catch { /* malformed referrer */ }
    }
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: page,
      page_referrer: referrer,
      send_to: measurementId,
    });
    previousPage.current = page;
  }, [measurementId, pathname, status, archivePage]);
  return null;
}
