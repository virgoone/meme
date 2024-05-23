import { ReactNode, Suspense, useEffect } from 'react'
import { redirect } from 'next/navigation'

import { auth, currentUser } from '@clerk/nextjs/server'

import Loading from '~/components/loading/Loading'

import Header from './Header'
import { Sidebar } from './Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  // const { userId } = auth()

  // if (!userId) {
  //   redirect('/')
  // }
  try {
    const user = await currentUser()
    if (!user || !user.publicMetadata.siteOwner) {
      redirect('/')
    }
  } catch (error) {
    console.log('error-->', error)
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <Sidebar />
      <section className="flex w-full min-w-0 flex-1">
        {/* 原有导航条需要整理到现在的导航条 TODO */}
        {/* <div className="z-10 absolute top-0 right-0 mt-6 mr-10 flex h-10 items-center">
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
              </div> */}
        <main className="relative flex w-full flex-1 flex-col items-stretch">
          <Header />
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-6">
                <Loading />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </section>
    </div>
  )
}
