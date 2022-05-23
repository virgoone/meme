/* eslint-disable @typescript-eslint/ban-ts-comment */
/*eslint-disable prefer-rest-params */
import React, { Fragment } from 'react'
import NextHead from 'next/head'
import Script from 'next/script'

interface HeadProps {
  title: string
  description?: string
  keywords?: string
  children?: React.ReactNode
}

export default function Head(props: HeadProps) {
  const { description, title, keywords, children } = props

  return (
    <Fragment>
      <NextHead>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon.ico"
        />
        <title>
          {process.env.NODE_ENV !== 'production' ? '[DEV] ' : ''}
          {title} - Koya's 个人博客
        </title>
        <meta name="description" content={`Koya的个人博客，${description}`} />
        <meta name='keywords' content={`Koya,Blog,个人博客,nextjs,${keywords || 'Nextjs Blog'}`} />
        {/* Import CSS for nprogress */}
        <link rel="stylesheet" type="text/css" href="/css/ngprogress.css" />
        {/* <!-- Global site tag (gtag.js) - Google Analytics --> */}
        <Script
          async
          id="googletagmanager"
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
        {children}
      </NextHead>
    </Fragment>
  )
}
