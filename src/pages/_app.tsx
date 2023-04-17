import '../styles/globals.css'
import '../styles/prism-theme.css'
import NProgress from 'nprogress'
import type { AppProps, NextWebVitalsMetric } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/zh-cn'
import 'react-cool-image/dist/style.css'
import { Analytics } from '@vercel/analytics/react'

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.locale('zh-cn')

function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
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
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <Analytics />
    </SessionProvider>
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
