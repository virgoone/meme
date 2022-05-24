import '../styles/globals.css'
import '../styles/prism-theme.css'
import NProgress from 'nprogress'
import type { AppProps, NextWebVitalsMetric } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Script from 'next/script'
import 'react-cool-image/dist/style.css'

if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  window.requestIdleCallback = (fn) => setTimeout(fn, 1)
  window.cancelIdleCallback = (e) => clearTimeout(e)
}

function MyApp({ Component, pageProps }: AppProps) {
  const { events } = useRouter()

  useEffect(() => {
    const handleChangeStart = (url: string) => {
      NProgress.start()
      if (process.env.__DEV__) {
        console.log(`Loading: ${url}`)
      }
    }
    const handleChangeComplete = () => {
      NProgress.done()
      window['gtag']?.('event', 'page_view', {
        page_title: document.title,
        page_location: document.location,
        page_path: window.location.href,
      })
    }
    events.on('routeChangeStart', handleChangeStart)
    events.on('routeChangeComplete', handleChangeComplete)

    return () => {
      events.off('routeChangeStart', handleChangeStart)
      events.off('routeChangeComplete', handleChangeComplete)
    }
  }, [])

  return (
    <>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=G-0Z128XH378"
        onLoad={() => {
          //  @ts-ignore
          window.dataLayer = window.dataLayer || []
          function gtag() {
            // @ts-ignore
            window.dataLayer.push(arguments)
          }
          window.gtag = window.gtag || gtag
          window?.gtag?.('js', new Date())

          window?.gtag?.('config', 'G-0Z128XH378')
        }}
      />
      <Script
        id="hotjar-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:2982392,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `,
        }}
      />
      <Component {...pageProps} />
    </>
  )
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric)
  const { id, name, label, value } = metric

  window?.gtag?.('event', name, {
    event_category:
      label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
    value: Math.round(name === 'CLS' ? value * 1000 : value), // values must be integers
    event_label: id, // id unique to current page load
    non_interaction: true, // avoids affecting bounce rate.
  })
}

export default MyApp
