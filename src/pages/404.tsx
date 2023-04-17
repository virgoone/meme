import * as React from 'react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import PageContainer from '../components/layouts/page'

const NotFoundPage: NextPage = () => {
  const router = useRouter()

  return (
    <>
      <PageContainer
        frontMatter={{
          title: '404 Not Found',
          description: '文章未找到或者已删除，404 Not Found',
        }}
      >
        <div className="flex items-center flex-col justify-center lg:flex-row py-28 px-6 md:px-24 md:py-20 lg:py-32 gap-16 lg:gap-28">
          <div className="w-full lg:w-1/2">
            <img
              className="hidden lg:block"
              src="https://i.ibb.co/v30JLYr/Group-192-2.png"
              alt=""
            />
            <img
              className="hidden md:block lg:hidden"
              src="https://i.ibb.co/c1ggfn2/Group-193.png"
              alt=""
            />
            <img
              className="md:hidden"
              src="https://i.ibb.co/8gTVH2Y/Group-198.png"
              alt=""
            />
          </div>
          <div className="w-screen lg:w-1/2">
            <h1 className="py-4 text-3xl lg:text-4xl font-extrabold text-gray-800">
              Looks like you've found the doorway to the great nothing
            </h1>
            <p className="py-4 text-base text-gray-800">
              The content you’re looking for doesn’t exist. Either it was
              removed, or you mistyped the link.
            </p>
            <p className="py-2 text-base text-gray-800">
              Sorry about that! Please visit our hompage to get where you need
              to go.
            </p>
            <button
              className="h-10 px-6 font-semibold rounded-md bg-black text-white"
              onClick={() => {
                router.replace('/')
                window?.gtag?.('event', 'back_to_home')
                //@ts-ignore
                // window?.dounione?.trackEvent('back_to_home', 'click')
              }}
            >
              回到首页
            </button>
          </div>
        </div>
      </PageContainer>
    </>
  )
}

export default NotFoundPage
