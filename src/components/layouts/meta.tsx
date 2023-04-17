import Head from 'next/head'
import Script from 'next/script'
import { useEffect } from 'react'

export default function Meta({
  title = '',
  description = '',
  keywords,
}: {
  title?: string
  description?: string
  keywords?: string[] | string
}) {
  return (
    <Head>
      <meta charSet="utf-8" />
      <title>{`${process.env.NODE_ENV === 'development' ? '[DEV]' : ''}${
        Array.isArray(title) ? title.join(' ') : title
      } - Koya's 个人博客`}</title>
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
      <meta
        name="viewport"
        content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"
      />
      <meta name="description" content={`Koya的个人博客，${description}`} />
      <meta
        name="keywords"
        content={`Koya,Blog,个人博客,nextjs,${
          Array.isArray(keywords)
            ? keywords.join(',')
            : keywords || 'Nextjs Blog'
        }`}
      />

      <link
        rel="apple-touch-icon"
        href="/apple-touch-icon.png"
        sizes="192x192"
      />

      <meta name="theme-color" content="#f6f8fa" />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
    </Head>
  )
}
