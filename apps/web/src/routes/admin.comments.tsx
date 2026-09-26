import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import { useAdminBlogPosts, useAdminComments, type CommentRecord } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, countByDay, countThisMonth, type DataTableColumn, ErrorText, SimpleDataTable, StatCard, StatGrid } from '../lib/admin-ui';
import { parseDisplayName } from '../lib/blog-post-state';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/comments')({
  component: AdminCommentsPage,
});

function AdminCommentsPage() {
  const comments = useAdminComments();
  const posts = useAdminBlogPosts();

  const postIndex = useMemo(() => {
    const map = new Map<string, { title: string; slug: string }>();
    if (posts.data) {
      for (const post of posts.data) {
        const entry = { title: post.title, slug: post.slug };
        if (post.id) map.set(post.id, entry);
        if (post.sanityId) map.set(post.sanityId, entry);
      }
    }
    return map;
  }, [posts.data]);

  const columns: DataTableColumn<CommentRecord>[] = useMemo(
    () => [
      {
        id: 'body',
        header: '评论内容',
        size: 420,
        minSize: 280,
        cell: (comment) => {
          const text = formatUnknown(comment.body) || `#${comment.id}`;
          return <span className='line-clamp-2 whitespace-normal text-sm' title={text}>{text}</span>;
        },
      },
      {
        id: 'post',
        header: '文章',
        size: 260,
        cell: (comment) => {
          const post = postIndex.get(comment.postId);
          return post ? (
            <Link to='/$slug' params={{ slug: post.slug }} className='block truncate text-sm hover:underline' title={post.title}>{post.title}</Link>
          ) : (
            <span className='block truncate text-muted-foreground text-xs' title={comment.postId}>{comment.postId}</span>
          );
        },
      },
      {
        id: 'user',
        header: '用户',
        size: 160,
        cell: (comment) => {
          const name = comment.userInfo ? parseDisplayName(comment.userInfo) : comment.userId;
          return <span className='block truncate text-sm' title={comment.userId}>{name}</span>;
        },
      },
      {
        id: 'createdAt',
        header: '时间',
        size: 150,
        cell: (comment) => <span className='text-muted-foreground text-sm'>{formatDate(comment.createdAt)}</span>,
      },
    ],
    [postIndex],
  );

  const isLoading = comments.isPending || posts.isPending;
  const error = comments.error ?? posts.error;

  return (
    <AdminPage>
      <AdminPageHeader title='评论' description='读者在文章段落下留下的评论。' />

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={10} />
      ) : error ? (
        <ErrorText error={error} />
      ) : comments.data ? (
        <>
          <StatGrid>
            <StatCard title='今日' value={countByDay(comments.data, 0)} />
            <StatCard title='本月' value={countThisMonth(comments.data)} />
            <StatCard title='总计' value={comments.data.length} />
          </StatGrid>
          <SimpleDataTable columns={columns} data={comments.data} getRowId={(comment) => String(comment.id)} pageSize={20} />
        </>
      ) : null}
    </AdminPage>
  );
}

function formatUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'text' in value) {
    return String((value as { text?: unknown }).text ?? '');
  }
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
