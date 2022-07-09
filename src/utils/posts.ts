import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import dayjs from 'dayjs'
import { getWordCount } from './words-count'
import { getPostFileSource } from '.'

const postsDirectory = join(process.cwd(), 'src', '_posts')

type PostCount = {
  total: number
  cn: number
  en: number
}
export interface PostType {
  slug: string
  title: string
  date: string
  coverImage: string
  description?: string
  keywords?: string[] | string
  tags?: string[] | string
  author: any
  ogImage: {
    url: string
  }
  content: string
  extra: {
    count: PostCount
    minutes: number
  }
}

export function getPostSlugs() {
  return fs
    .readdirSync(postsDirectory, {
      withFileTypes: true,
    })
    .filter((path) => /\.mdx?$/.test(path.name))
}

export async function getPostBySlug(slug: string, fields: string[] = []) {
  const fullPath = join(postsDirectory, slug)
  // const postFilePath = join(POSTS_PATH, `${params.slug}.mdx`)
  // const postFileMDPath = join(POSTS_PATH, `${params.slug}.md`)
  const realSlug = slug.replace(/\.mdx?$/, '')
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  if (data.date) {
    data.date = dayjs(data.date).local().format()
    // new Date(data.date).toISOString()
  }

  const mdxSource = await getPostFileSource(content, data)

  data.extra = getWordCount(content)

  type Items = {
    [key: string]: any
  }

  if (!fields.length) {
    return {
      ...data,
      content: mdxSource,
      slug: realSlug,
    }
  }

  const items: Items = {}

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug
    }
    if (field === 'content') {
      items[field] = mdxSource
    }

    if (typeof data[field] !== 'undefined') {
      items[field] = data[field]
    }
  })

  return items
}

export async function getAllPosts(fields: string[] = []) {
  const files = getPostSlugs()
  const posts = await Promise.all(
    files.map((file) => getPostBySlug(file.name, fields)),
  )

  // sort posts by date in descending order
  return posts.sort((post1, post2) =>
    new Date(post1.date) > new Date(post2.date) ? -1 : 1,
  )
}
