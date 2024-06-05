import './(blog)/[slug]/blog.css'

import { Suspense } from 'react'

import { Analytics } from '@vercel/analytics/react'

import { Footer } from '~/app/(main)/Footer'
import { Header } from '~/app/(main)/Header'
import Script from 'next/script'

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 select-none bg-[url('/grid-black.svg')] bg-top bg-repeat dark:bg-[url('/grid.svg')]" />
      <span className="pointer-events-none fixed top-0 block h-[800px] w-full select-none bg-[radial-gradient(103.72%_46.58%_at_50%_0%,rgba(5,5,5,0.045)_0%,rgba(0,0,0,0)_100%)] dark:bg-[radial-gradient(103.72%_46.58%_at_50%_0%,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0)_100%)]" />

      <div className="fixed inset-0 flex justify-center sm:px-8">
        <div className="flex w-full max-w-7xl lg:px-8">
          <div className="w-full bg-zinc-50/90 ring-1 ring-zinc-100 dark:bg-zinc-900/80 dark:ring-zinc-400/20" />
        </div>
      </div>

      <div className="relative text-zinc-800 dark:text-zinc-200">
        <Header />
        <main>{children}</main>
        <Suspense>
          <Footer />
        </Suspense>
      </div>
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
      <Analytics />
    </>
  )
}
