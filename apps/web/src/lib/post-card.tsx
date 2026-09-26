import { Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { formatDate, moodEmoji, moodLabel } from './format';
import { CalendarIcon, CursorClickIcon, HourglassIcon } from './icons';

export type PostCardItem = {
  views?: number;
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mood: 'happy' | 'sad' | 'neutral' | null;
  readingTime: number | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
};

export function BlogPostCard({ post, archivePage }: { post: PostCardItem; archivePage?: number }) {
  const coverImageUrl = post.coverImageUrl ?? fallbackCover(post.slug);

  return (
    <Link
      to='/$slug'
      params={{ slug: post.slug }}
      state={previous => ({ ...previous, blogArchivePage: archivePage })}
      className='legacy-post-card'
      style={{ '--post-image': `url("${coverImageUrl}")` } as CSSProperties}
    >
      <div className='legacy-post-card__image'>
        <img src={coverImageUrl} alt='' loading='lazy' />
      </div>
      <span className='legacy-post-card__body'>
        <span className='legacy-post-card__meta'>
          <span>
            <CalendarIcon aria-hidden='true' />
            {formatDate(post.publishedAt)}
          </span>
          <span>
            <span className='legacy-mood-emoji' aria-hidden='true'>
              {moodEmoji(post.mood)}
            </span>
            {moodLabel(post.mood)}
          </span>
          <span>
            <HourglassIcon aria-hidden='true' />
            {Math.round(post.readingTime ?? 0)}分钟阅读
          </span>
          <span title={typeof post.views === 'number' ? `${post.views} 次浏览` : undefined}>
            <CursorClickIcon aria-hidden='true' />
            {typeof post.views === 'number' ? Intl.NumberFormat('zh-CN').format(post.views) : '—'} 次浏览
          </span>
        </span>
        <span className='legacy-post-card__title-row'>
          <h2>{post.title}</h2>
          <span aria-hidden='true' className='legacy-post-card__arrow'>
            ↗
          </span>
        </span>
        {post.description && <p>{post.description}</p>}
      </span>
    </Link>
  );
}

export function BlogPostCardSkeleton() {
  return (
    <div
      className='legacy-post-card legacy-post-card--skeleton'
      aria-hidden='true'
    >
      <div className='legacy-post-card__image' />
      <span className='legacy-post-card__body'>
        <span className='legacy-post-card__meta'>
          <span className='skeleton-line skeleton-line--meta' />
          <span className='skeleton-line skeleton-line--meta' />
          <span className='skeleton-line skeleton-line--meta' />
          <span className='skeleton-line skeleton-line--meta' />
        </span>
        <span className='post-skeleton-title'>
          <span className='skeleton-line skeleton-line--title' />
          <span className='skeleton-line skeleton-line--title-short' />
        </span>
        <span className='post-skeleton-description'>
          <span className='skeleton-line skeleton-line--text' />
          <span className='skeleton-line skeleton-line--text-short' />
        </span>
      </span>
    </div>
  );
}

function fallbackCover(slug: string) {
  const hue =
    [...slug].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="hsl(${hue} 24% 18%)"/><path d="M0 520C220 430 330 640 590 520S910 300 1200 390V675H0Z" fill="hsl(${hue} 55% 55%)" fill-opacity=".45"/><circle cx="930" cy="180" r="180" fill="hsl(${hue} 70% 70%)" fill-opacity=".35"/></svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
