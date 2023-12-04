import fs from 'fs'
import {join} from 'path'
import matter from 'gray-matter'
import { useRouter } from "next/router";
import { useEffect, useState } from 'react'
import Layout from '../../layouts/mdx'
import { getPostFileSource } from '../../utils'

interface AboutProps {
  title: string
  date: string
  content: string
  source?: any
}

const About = (props: AboutProps) => {
  const { source, ...meta } = props
  const router = useRouter();
  const [verifyState, setVerifyState] = useState(false)
  //路由格式为'/projects/:id'
  const pwd= router.query.pwd 
  if (!pwd || pwd !== '951C16718528C40A6C757B089660D28D'||!verifyState) {
    return <div className="text-center p-5">无访问权限</div>
  }

  useEffect(()=>{
    window.location.replace('about')
    setVerifyState(true)
  }, [pwd])
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
