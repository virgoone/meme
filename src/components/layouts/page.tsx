'use client'

import React from 'react'
import { ThemeProvider } from 'next-themes'
import Header from '../header'
import { ActiveAnchor } from '../../misc/active-anchor'
import Meta from './meta'

interface PageProps {
  frontMatter: {
    slug?: string
    title: string
    description?: string
    version?: string
    keywords?: string
  }
  children: React.ReactNode
}

export default function Page(props: PageProps) {
  const { children, frontMatter } = props
  const { title, description, keywords } = frontMatter

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Meta title={title} keywords={keywords} description={description} />
      <Header />
      <ActiveAnchor>
        <main className="max-w-3xl mx-auto px-6 md:px-8 py-8 lg:py-12">
          {children}
        </main>
      </ActiveAnchor>
    </ThemeProvider>
  )
}
