import 'aieditor/dist/style.css'
import './globals.css'
import './clerk.css'
import './prism.css'

import { AntdRegistry } from '@ant-design/nextjs-registry'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'

import { ThemeProvider } from '~/app/(main)/ThemeProvider'
import { QueryProvider } from '~/app/QueryProvider'
import HotjarSnippet from '~/components/HotjarSnippet'
import AntdThemeProvider from '~/components/theme/theme-provider'
import { Toaster } from '~/components/ui/toaster'
import { url } from '~/lib'
import { zhCN } from '~/lib/clerkLocalizations'
import { sansFont } from '~/lib/font'
import { seo } from '~/lib/seo'

export const metadata: Metadata = {
  metadataBase: seo.url,
  title: {
    template: '%s | Koya`s Blog',
    default: seo.title,
  },
  description: seo.description,
  keywords:
    'Koya,Blog,个人博客,nextjs,NodeJS,上传,File,云存储, NodeJS,上传, JavaScript 浮点数计算,IEEE 754 标准,二进制数系统,Notion,VUE,编程,程序员,开发者,Hacker News,ECMAScript,CRA,cli,渠道投放,开发者,前端,创新,细节控,博客',
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: {
      default: seo.title,
      template: '%s | Koya`s Blog',
    },
    description: seo.description,
    siteName: 'Koya`s Blog',
    locale: 'zh_CN',
    type: 'website',
    url: 'https://blog.douni.one',
  },
  twitter: {
    site: '@koyaguo',
    creator: '@koyaguo',
    card: 'summary_large_image',
    title: seo.title,
    description: seo.description,
  },
  alternates: {
    canonical: url('/'),
    types: {
      'application/rss+xml': [{ url: 'rss', title: 'RSS 订阅' }],
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000212' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkProvider
        appearance={{
          baseTheme: [dark],
        }}
        localization={zhCN as any}
      >
        <html
          lang="zh-CN"
          className={`${sansFont.variable} m-0 h-full p-0 font-sans antialiased`}
          suppressHydrationWarning
        >
          <body className="flex h-full flex-col">
            <QueryProvider>
              <AntdRegistry>
                <AntdThemeProvider>{children}</AntdThemeProvider>
              </AntdRegistry>
            </QueryProvider>

            <Toaster />
            <HotjarSnippet />
          </body>
          <GoogleAnalytics gaId="G-0Z128XH378" />
        </html>
      </ClerkProvider>
    </ThemeProvider>
  )
}
