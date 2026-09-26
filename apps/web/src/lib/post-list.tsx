import { Link } from '@tanstack/react-router';

import type { PostCardItem } from './admin-queries';
import { formatDateCompact } from './format';

export type { PostCardItem };

export function PostRow({ post, archivePage, showDescription = true }: { post: PostCardItem; archivePage?: number; showDescription?: boolean }) {
  const minutes = Math.max(1, Math.round(post.readingTime ?? 0));
  return (
    <li>
      <Link
        to='/$slug'
        params={{ slug: post.slug }}
        state={(previous) => ({ ...previous, blogArchivePage: archivePage })}
        className='site-row'
      >
        <h2 className='site-row__title'>{post.title}</h2>
        <span className='site-row__meta'>
          <span>{minutes} 分钟</span>
          {typeof post.views === 'number' ? <span>{Intl.NumberFormat('zh-CN').format(post.views)} 次浏览</span> : null}
          <time dateTime={post.publishedAt ?? undefined}>{formatDateCompact(post.publishedAt)}</time>
        </span>
        {showDescription && post.description ? <p className='site-row__desc'>{post.description}</p> : null}
      </Link>
    </li>
  );
}

export function PostRowSkeleton() {
  return (
    <li aria-hidden='true'>
      <span className='skeleton-line skeleton-line--title' />
      <span className='skeleton-line skeleton-line--text' />
    </li>
  );
}

export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className='site-rows site-skeleton-rows' role='status' aria-label='文章列表加载中'>
      {Array.from({ length: count }, (_, index) => <PostRowSkeleton key={index} />)}
    </ul>
  );
}
