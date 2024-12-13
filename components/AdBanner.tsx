'use client'

import { useEffect } from 'react'

import { cn } from '~/lib/utils'

const AdBanner = (props) => {
  const { className, ...restProps } = props

  useEffect(() => {
    try {
      if (
        //@ts-ignore
        window.adsbygoogle?.loaded ||
        process.env.NODE_ENV === 'development'
      ) {
        return
      }
      //@ts-ignore
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.log(err)
    }
  }, [])
  if (process.env.NODE_ENV === 'development') {
    return null
  }
  return (
    <ins
      className={cn('adsbygoogle adbanner-customize', className)}
      style={{
        display: 'block',
        overflow: 'hidden',
      }}
      data-ad-client="ca-pub-3801577709600181"
      {...restProps}
    />
  )
}
export default AdBanner
