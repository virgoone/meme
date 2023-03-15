import Link from 'next/link'
import dayjs from 'dayjs'
import { PostType } from '../utils/posts'

function distanceToNow(dateTime: string) {
  return dayjs(dateTime).fromNow()
}
const A = ({
  children,
  ...props
}: {
  children: React.ReactNode
  className?: string
  href: string
}) => {
  const isExternal = props.href && props.href.startsWith('https://')
  if (isExternal) {
    return (
      <a target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    )
  }
  return (
    <Link {...props} href={props.href}>
      {children}
    </Link>
  )
}

const Tags = ({ tags }: { tags?: string[] | string | undefined }) => {
  if (!tags) {
    return null
  }
  const tagList = Array.isArray(tags) ? tags : tags.split(',')
  return (
    <>
      {tagList.map((tag: string, index: number) => (
        <span
          className="tag ml-2 text-xs text-gray-400 dark:text-gray-500"
          key={index}
        >{`# ${tag}`}</span>
      ))}
    </>
  )
}

export default function PostItem(props: { post: PostType }) {
  const { title, description, slug, date, ...metadata } = props.post

  return (
    <article className="post-item relative group" aria-label={title}>
      <A href={`/${slug}`}>
        <div className="absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-xl group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50"></div>
        <div className="relative">
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-200 pt-8 lg:pt-0 post-item-title">
            {title}
            <span className="block">
              <Tags tags={metadata.tags} />
            </span>
          </h3>
          <div className="mt-2 mb-4 wysiwyg wysiwyg-slate wysiwyg-a:relative wysiwyg-a:z-10 dark:wysiwyg-dark line-clamp-3 max-w-none">
            {description}
          </div>
        </div>
        <dl className="relative">
          <dt className="sr-only">Date</dt>
          <dd className="whitespace-nowrap text-sm leading-6 dark:text-slate-400">
            <div className="flex items-center">
              <time className="mr-2" dateTime={date}>
                {distanceToNow(date)}
              </time>
              {metadata.extra && (
                <>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{`大概 ${
                    metadata.extra.minutes || 1
                  } 分钟`}</span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{`${
                    metadata.extra.count.total || 1
                  } 字`}</span>
                </>
              )}
            </div>
          </dd>
        </dl>
      </A>
    </article>
  )
}
