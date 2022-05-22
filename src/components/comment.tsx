import React from 'react'
import Giscus from '@giscus/react'
import { useTheme } from 'next-themes'

export default function Comment() {
  const { theme } = useTheme()

  return (
    <section className="w-full relative giscus pt-8">
      <Giscus
        id="comments"
        repo="virgoone/meme"
        repoId="R_kgDOHYCtKw"
        category="Announcements"
        categoryId="DIC_kwDOHYCtK84CPOmD"
        mapping="pathname"
        term="Welcome to @giscus/react component!"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme={theme === 'light' ? 'light_protanopia' : 'dark_protanopia'}
        lang="zh-CN"
        loading="lazy"
      />
    </section>
  )
}
