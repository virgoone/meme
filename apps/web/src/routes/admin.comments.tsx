import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import {
  useAdminBlogPosts,
  useAdminComments,
  type CommentRecord,
  type PostSummary,
} from '../lib/admin-queries';
import {
  AdminPageHeader,
  StatCard,
  type DataTableColumn,
  SimpleDataTable,
} from '../lib/admin-ui';
import { parseDisplayName } from '../lib/blog-post-state';
import { formatDate } from '../lib/format';

export const Route = createFileRoute('/admin/comments')({
  component: AdminCommentsPage,
});

function AdminCommentsPage() {
  const comments = useAdminComments();
  const posts = useAdminBlogPosts();

  const postTitle = useMemo(() => {
    const map = new Map<string, string>();
    if (posts.data) {
      for (const post of posts.data) {
        if (post.id) map.set(post.id, post.title);
        if (post.sanityId) map.set(post.sanityId, post.title);
      }
    }
    return map;
  }, [posts.data]);

  const columns: DataTableColumn<CommentRecord>[] = useMemo(
    () => [
      {
        id: 'body',
        header: '评论内容',
        cell: (comment) => {
          const text = formatUnknown(comment.body) || `#${comment.id}`;
          return (
            <span className='admin-cell-truncate' title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'post',
        header: '文章',
        cell: (comment) => {
          const title = postTitle.get(comment.postId);
          return (
            <span className='admin-cell-truncate' title={comment.postId}>
              {title ?? comment.postId}
            </span>
          );
        },
      },
      {
        id: 'user',
        header: '用户',
        cell: (comment) => {
          const name = comment.userInfo
            ? parseDisplayName(comment.userInfo)
            : comment.userId;
          return (
            <span className='admin-cell-truncate' title={comment.userId}>
              {name}
            </span>
          );
        },
      },
      {
        id: 'createdAt',
        header: '创建时间',
        cell: (comment) => formatDate(comment.createdAt),
      },
    ],
    [postTitle],
  );

  const isLoading = comments.isPending || posts.isPending;
  const isError = comments.isError || posts.isError;
  const error = comments.error ?? posts.error;

  return (
    <section className='admin-page'>
      <AdminPageHeader title='评论' description='最近导入和新提交的评论。' />

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={10} />
      ) : isError ? (
        <p className='admin-error'>
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : comments.data ? (
        <>
          <div className='admin-stat-grid'>
            <StatCard title='今日评论数' value={countByDay(comments.data, 0)} />
            <StatCard title='本月评论数' value={countThisMonth(comments.data)} />
            <StatCard title='总评论数' value={comments.data.length} />
          </div>
          <SimpleDataTable
            columns={columns}
            data={comments.data}
            getRowId={(comment) => String(comment.id)}
          />
        </>
      ) : null}
    </section>
  );
}

function countByDay<T extends { createdAt: string | null }>(rows: T[], offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  const target = date.toISOString().slice(0, 10);
  return rows.filter((row) => row.createdAt?.slice(0, 10) === target).length;
}

function countThisMonth<T extends { createdAt: string | null }>(rows: T[]) {
  const target = new Date().toISOString().slice(0, 7);
  return rows.filter((row) => row.createdAt?.slice(0, 7) === target).length;
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
