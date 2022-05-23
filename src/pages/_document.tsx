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
