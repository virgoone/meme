import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { AdPlacement } from '@meme/shared';
import { publicConfigQueryOptions } from './admin-queries';
import { siteUrl } from './seo';
import './adsense.css';

type AdWindow = Window & { adsbygoogle?: { push: (parameters: Record<string, never>) => unknown } };
let scriptLoad: { client: string; promise: Promise<void> } | undefined;

function loadAdSense(client: string) {
  if (scriptLoad) return scriptLoad.client === client ? scriptLoad.promise : Promise.reject(new Error('AdSense configuration changed; reload required'));
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-adsense';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    const timeout = window.setTimeout(() => reject(new Error('AdSense unavailable')), 15_000);
    script.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('AdSense blocked')); }, { once: true });
    document.head.appendChild(script);
  });
  scriptLoad = { client, promise };
  return promise;
}

/** One manual display unit per page; verification remains when display is off. */
export function AdBanner({ placement, instanceKey = '', className = '' }: { placement: AdPlacement; instanceKey?: string; className?: string }) {
  const { data } = useQuery(publicConfigQueryOptions());
  const pathname = useRouterState({ select: state => state.location.pathname });
  const config = data?.adsense;
  if (!config?.enabled || !config.clientId || !config.slotId || !config.placements[placement]) return null;
  return <DisplayAd key={`${pathname}:${instanceKey}:${config.clientId}:${config.slotId}`} client={config.clientId} slot={config.slotId} placement={placement} className={className} />;
}

function DisplayAd({ client, slot, placement, className }: { client: string; slot: string; placement: AdPlacement; className: string }) {
  const unitRef = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (collapsed) return;
    const unit = unitRef.current;
    if (!unit || window.location.origin !== siteUrl) { setCollapsed(true); return; }
    let disposed = false;
    let nearViewport = false;
    let starting = false;
    let responseTimeout: number | undefined;
    const status = () => {
      const value = unit.getAttribute('data-ad-status');
      if (value === 'filled' || value === 'unfilled' || value === 'unfill-optimized') clearTimeout(responseTimeout);
      if (value === 'unfilled') setCollapsed(true);
    };
    const mutation = new MutationObserver(status);
    mutation.observe(unit, { attributes: true, attributeFilter: ['data-ad-status'] });
    status();
    const request = () => {
      if (disposed || starting || requested.current || !nearViewport || unit.getBoundingClientRect().width < 200) return;
      starting = true;
      void loadAdSense(client).then(() => {
        if (disposed || !unit.isConnected || requested.current) return;
        requested.current = true;
        if (!unit.hasAttribute('data-adsbygoogle-status')) {
          const target = window as AdWindow;
          target.adsbygoogle ??= [] as Record<string, never>[];
          target.adsbygoogle.push({});
        }
        status();
        responseTimeout = window.setTimeout(() => {
          // Never remove a filled ad or interrupt an iframe that is rendering.
          if (!disposed && !unit.getAttribute('data-ad-status') && !unit.querySelector('iframe')) setCollapsed(true);
        }, 30_000);
      }).catch(() => { if (!disposed) setCollapsed(true); });
    };
    const intersection = new IntersectionObserver(entries => {
      nearViewport = entries.some(entry => entry.isIntersecting);
      request();
    }, { rootMargin: '400px 0px' });
    const resize = new ResizeObserver(request);
    intersection.observe(unit);
    resize.observe(unit);
    return () => { disposed = true; clearTimeout(responseTimeout); intersection.disconnect(); resize.disconnect(); mutation.disconnect(); };
  }, [client, collapsed]);

  if (collapsed) return null;
  return <aside className={`blog-ad blog-ad--${placement} ${className}`} aria-label='广告' data-ad-placement={placement}>
    <span className='blog-ad-label'>广告</span>
    {/* Google permits fluid width/fixed height; keep sizing next to the unit. */}
    <style>{`.KoyaDisplayAd{display:block;width:100%;height:100px;max-width:970px;margin:0 auto}@media(min-width:768px){.KoyaDisplayAd{height:90px}}`}</style>
    <ins ref={unitRef} className='adsbygoogle KoyaDisplayAd' data-ad-client={client} data-ad-slot={slot} />
  </aside>;
}
