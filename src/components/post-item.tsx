import Link from 'next/link'
import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict'
import { PostType } from '../utils/posts

function distanceToNow(dateTime: Date) {
  return formatDistanceToNowStrict(dateTime, {
    addSuffix: true,
  })
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
    <Link href={props.href || ''}>
      <a {...props}>{children}</a>
    </Link>
  )
}

export default function PostItem(props: { post: PostType }) {
  const { title, description, slug, content, date } = props.post

  return (
    <article className="post-item relative group" aria-label={title}>
      <div className="absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-xl group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/50"></div>
      <div className="relative">
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-200 pt-8 lg:pt-0 post-item-title">
          {title}
        </h3>
        <div className="mt-2 mb-4 wysiwyg wysiwyg-slate wysiwyg-a:relative wysiwyg-a:z-10 dark:wysiwyg-dark line-clamp-3 max-w-none">
          {description}
        </div>
      </div>
      <dl className="relative">
        <dt className="sr-only">Date</dt>
        <dd className="whitespace-nowrap text-sm leading-6 dark:text-slate-400">
          <A
            className="flex items-center text-sm text-sky-500 font-medium"
            href={`/${slug}`}
          >
            <span className="absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-2xl"></span>
            <span className="relative">Read more</span>
          </A>
          <time dateTime={date}>{distanceToNow(new Date(date))}</time>
        </dd>
      </dl>
    </article>
  )
}
