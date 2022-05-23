import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

const postsDirectory = join(process.cwd(), 'src', '_posts')

export type PostType = {
  slug: string
  title: string
  subtitle: string
  keywords: string
  description: string
  tags: string[]
  date: string
  cover_image: string
  cover_detail: string
  content: string
}

export function getPostSlugs() {
  return fs
    .readdirSync(postsDirectory, {
      withFileTypes: true,
    })
    .filter((path) => /\.mdx?$/.test(path.name))
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  const fullPath = join(postsDirectory, slug)
  const realSlug = slug.replace(/\.mdx?$/, '')
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  data.date = new Date(data.date).toISOString()

  type Items = {
    [key: string]: any
  }

  const items: Items = {}

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug
    }
    if (field === 'content') {
      items[field] = content
    }

    if (typeof data[field] !== 'undefined') {
      items[field] = data[field]
    }
  })

  return items
}

export function getAllPosts(fields: string[] = []) {
  const files = getPostSlugs()
  const posts = files
    .map((file) => getPostBySlug(file.name, fields))
    .sort((post1, post2) =>
      new Date(post1.date) > new Date(post2.date) ? -1 : 1,
    )

  // sort posts by date in descending order
  return posts
}
