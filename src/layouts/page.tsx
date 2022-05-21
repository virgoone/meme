import React from 'react'
import { ThemeProvider } from 'next-themes'
import Head from '../components/head'
import Header from '../components/header'
import { ActiveAnchor } from '../misc/active-anchor'

interface PageProps {
  frontMatter: {
    slug?: string
    title: string
    description?: string
    version?: string
  }
  children: React.ReactNode
}

export default function Page(props: PageProps) {
  const { children, frontMatter } = props
  const { title, description } = frontMatter

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <Head title={title} description={description} />
      <Header />
      <ActiveAnchor>
        <main className="max-w-3xl mx-auto px-6 md:px-8 py-8 lg:py-12">{children}</main>
      </ActiveAnchor>
    </ThemeProvider>
  )
}
