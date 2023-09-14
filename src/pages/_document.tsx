/* eslint-disable react/react-in-jsx-scope */
import Document, { Html, Head, Main, NextScript } from 'next/document'
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
           <Script async id="Adsense-id"
             strategy="beforeInteractive"
             crossorigin="anonymous"
             src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3801577709600181"></Script>
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
