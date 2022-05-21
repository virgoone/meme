import '../styles/globals.css'
import '../styles/prism-theme.css'
import NProgress from 'nprogress'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

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
    }
    events.on('routeChangeStart', handleChangeStart)
    events.on('routeChangeComplete', handleChangeComplete)

    return () => {
      events.off('routeChangeStart', handleChangeStart)
      events.off('routeChangeComplete', handleChangeComplete)
    }
  }, [])

  return <Component {...pageProps} />
}

export default MyApp
