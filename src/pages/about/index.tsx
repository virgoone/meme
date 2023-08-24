import fs from 'fs'
import {join} from 'path'
import matter from 'gray-matter'
import Layout from '../../components/layouts/mdx'
import { getPostFileSource } from '../../utils/post'

interface AboutProps {
  title: string
  date: string
  content: string
  source?: any
}

const About = (props: AboutProps) => {
  const { source, ...meta } = props

  return <Layout source={source} frontMatter={meta} />
}

export default About

export async function getStaticProps() {
  const source = fs.readFileSync(
    join(process.cwd(), 'src', 'pages/about', '_about.mdx'),
    'utf-8'
  )

  const { content, data } = matter(source)

  data.date = new Date(data.date).toISOString()

  const mdxSource = await getPostFileSource(content, data)

  return {
    props: {
      ...data,
      source: mdxSource,
    },
  }
}
