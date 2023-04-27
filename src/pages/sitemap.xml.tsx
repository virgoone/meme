import { GetServerSideProps } from 'next'
import { SitemapStream, streamToPromise } from 'sitemap'
import { Readable } from 'stream'
import { postFilePaths } from '../utils/post'

type SiteMapProps = {}

function SiteMap(props: SiteMapProps) {
  return null
}

export const getServerSideProps: GetServerSideProps<any> = async ({ res }) => {
  res.setHeader('Content-Type', 'application/xml')

  const staticPaths = postFilePaths
    // Remove file extensions for page paths
    .map((path) => path.replace(/\.mdx?$/, ''))
    .map((slug) => ({ url: `/${slug}`, changefreq: 'weekly', priority: 1.0 }))
  const links = [
    { url: '/', changefreq: 'monthly', priority: 1 },
    ...staticPaths,
    { url: '/about', changefreq: 'monthly', priority: 0.1 },
  ]

  const smStream = new SitemapStream({ hostname: 'https://blog.douni.one' })
  const result = await streamToPromise(Readable.from(links).pipe(smStream))
  res.write(result.toString())
  res.end()

  return {
    props: {},
  }
}

export default SiteMap
