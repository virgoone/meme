/* eslint-disable react/react-in-jsx-scope */
import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from 'next/document'
import Script from 'next/script'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="true"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=optional"
            rel="stylesheet"
          />
          {/* Import CSS for nprogress */}
          <link rel="stylesheet" type="text/css" href="/css/ngprogress.css" />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=G-0Z128XH378`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          <meta
            name="google-site-verification"
            content="1oG2zzjYlvotiNvqILcn6NlqInOHK_Ncgr6RolwWSgI"
          />
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
          {/* <Script
            async
            defer
            data-website-id="62ebd1d8-92c8-46a0-bcc3-af94aab78fcd"
            src="https://sa.douni.one/dounione.js"
            onLoad={() => {
              // @ts-ignore
              window.dounione = window.dounione || window.umami || {}
            }}
          /> */}
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
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
