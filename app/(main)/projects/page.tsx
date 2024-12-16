import { type Metadata } from 'next'

import { Projects } from '~/app/(main)/projects/Projects'
import { Container } from '~/components/oui/Container'
import AdBanner from '~/components/AdBanner'

const title = '我的项目'
const description = '我参与过或者开源的一些小项目，希望对你有所帮助。'
export const metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
  },
} satisfies Metadata

export default function ProjectsPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
          我的项目。
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          我做过的一些小项目，有<b>开源</b>的，有<b>实验</b>
          的，也有 <b> 做着玩 </b>
          的。
        </p>
      </header>
      <div className="mt-16 sm:mt-20">
        <Projects />
      </div>
      <AdBanner
        className="my-4 w-full"
        data-ad-slot="2131063994"
        data-ad-format="auto"
        data-id="456"
        data-full-width-responsive="true"
      />
    </Container>
  )
}

export const revalidate = 3600
