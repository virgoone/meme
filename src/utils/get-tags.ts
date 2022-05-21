export default function getTags(page: any) {
  if (!page.frontMatter) {
    return []
  }
  const tags = page.frontMatter.tag || ''
  return tags.split(',').map((s: string) => s.trim())
}
