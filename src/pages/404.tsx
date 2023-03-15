import * as React from 'react'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import PageContainer from '../layouts/page'

const NotFoundPage: NextPage = () => {
  const router = useRouter()

  return (
    <>
      <PageContainer
        frontMatter={{
          title: '404 Not Found',
          description:
            '文章未找到或者已删除，404 Not Found',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '680px',
            height: 540,
            margin: '30px auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <iframe
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            src="https://embed.lottiefiles.com/animation/4047"
          />
          <button
            className='h-10 px-6 font-semibold rounded-md bg-black text-white'
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
      </PageContainer>
    </>
  )
}

export default NotFoundPage
