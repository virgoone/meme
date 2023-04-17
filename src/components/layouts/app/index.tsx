'use client'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode, Suspense, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { BellAlert, Plus, Search } from '@/components/shared/icons'
import { NextUIProvider, CssBaseline } from '@nextui-org/react'
import Meta from '../meta'
import Sidebar from './sidebar'
import Loading from './loading'
import Head from 'next/head'

export default function AppLayout({
  children,
  bgWhite,
  title = 'App',
}: {
  children: ReactNode
  bgWhite?: boolean
  title?: string
}) {
  const router = useRouter()
  const { slug, key } = router.query as {
    slug?: string
    key?: string
  }

  useEffect(() => {
    // 在客户端渲染时，忽略警告
    if (typeof window !== 'undefined') {
      const suppressWarnings = true
      const root = document.getElementById('__next')
      root?.setAttribute('suppressHydrationWarning', String(suppressWarnings))
    }
  }, [])

  return (
    <NextUIProvider>
      <Meta title="App" />
      <Head>{CssBaseline.flush()}</Head>
      <Toaster />
      <div className="flex h-screen flex-col bg-white text-body dark:bg-dark-14 dark:text-dark-body">
        <div className="flex-grow overflow-auto">
          <div className="flex h-full">
            <Sidebar />
            <section className="relative mx-auto w-full max-w-200 overflow-auto">
              <div className="z-10 absolute top-0 right-0 mt-6 mr-10 flex h-10 items-center">
                <div>
                  <button className="focus:outline-none h-10 w-10 rounded p-2 text-wedges-gray-400 hover:bg-light-97 dark:text-[#f7f7f8] dark:hover:bg-dark-19">
                    <Search className="h-6 w-6 fill-transparent stroke-current" />
                  </button>
                </div>
                <div>
                  <button className="focus:outline-none group relative h-10 w-10 rounded p-2 text-wedges-gray-400 hover:bg-light-97 dark:text-[#f7f7f8] dark:hover:bg-dark-19">
                    <BellAlert className="h-6 w-6 fill-transparent stroke-current" />
                  </button>
                </div>
                <div className="ml-2">
                  <button className="btn-plain h-9 w-9 rounded-full bg-[#7047eb] p-0 text-white transition-transform duration-200 ease-out hover:scale-110 hover:transform">
                    <Plus className="mx-auto h-6 w-6 stroke-current" />
                  </button>
                </div>
              </div>
              <div className="relative min-h-screen px-10 pt-6 pb-32">
                <div>
                  <header className="mb-8 flex h-10 items-center">
                    <h2 className="text-2xl font-medium tracking-[-0.01em] dark:text-dark-95">
                      {title}
                    </h2>
                  </header>
                  <Suspense fallback={<Loading />}>
                    <div>
                      <div>{children}</div>
                    </div>
                  </Suspense>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </NextUIProvider>
  )
}
