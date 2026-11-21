import { createFileRoute, Link } from '@tanstack/react-router';
import { MessageSquare } from 'lucide-react';
import { useMemo } from 'react';

import { type CommentRecord, useAdminBlogPosts, useAdminComments } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, countByDay, countThisMonth, ErrorText, StatCard, StatGrid } from '../lib/admin-ui';
import { parseDisplayName } from '../lib/blog-post-state';
import { formatDate } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { FilterChoice, FilterPopover, ListToolbar, matches, PageFooter, paginate, SearchBox, useUrlList } from '../lib/sluice/list-controls';
import { Badge, Button, EmptyState, TableCard } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/comments')({
  component: AdminCommentsPage,
});

const COMMENT_KEYS = ['type'] as const;

function AdminCommentsPage() {
  const comments = useAdminComments();
  const posts = useAdminBlogPosts();
  const { state, set } = useUrlList(COMMENT_KEYS);

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

  const columns: Column<CommentRecord>[] = useMemo(
    () => [
      {
        id: 'body',
        header: '评论内容',
        className: 'max-w-[260px] sm:max-w-md',
        cell: (comment) => {
          const text = formatUnknown(comment.body) || `#${comment.id}`;
          return (
            <div className='min-w-0'>
              <span className='line-clamp-2 whitespace-normal break-words type-sm text-title' title={text}>{text}</span>
              {comment.parentId != null ? <Badge tone='outline' className='mt-1'>回复</Badge> : null}
            </div>
          );
        },
      },
      {
        id: 'post',
        header: '文章',
        hideOnMobile: true,
        className: 'max-w-[240px]',
        cell: (comment) => {
          const post = postIndex.get(comment.postId);
          return post ? (
            <Link to='/$slug' params={{ slug: post.slug }} className='block truncate type-sm text-subtitle hover:text-title hover:underline' title={post.title}>{post.title}</Link>
          ) : (
            <span className='block truncate text-description type-xs' title={comment.postId}>{comment.postId}</span>
          );
        },
      },
      {
        id: 'user',
        header: '用户',
        hideOnMobile: true,
        className: 'max-w-[180px]',
        cell: (comment) => <span className='block truncate type-sm text-subtitle' title={comment.userId}>{authorName(comment)}</span>,
      },
      {
        id: 'createdAt',
        header: '时间',
        cell: (comment) => <span className='whitespace-nowrap text-description type-sm'>{formatDate(comment.createdAt)}</span>,
      },
    ],
    [postIndex],
  );

  const isLoading = comments.isPending || posts.isPending;
  const error = comments.error ?? posts.error;
  const all = comments.data ?? [];
  const replyCount = all.filter((comment) => comment.parentId != null).length;
  const filtered = all.filter((comment) => {
    if (state.type === 'top' && comment.parentId != null) return false;
    if (state.type === 'reply' && comment.parentId == null) return false;
    return matches(state.q, authorName(comment), comment.userId, formatUnknown(comment.body), postIndex.get(comment.postId)?.title);
  });
  const slice = paginate(filtered, state.page, state.size);

  return (
    <AdminPage>
      <AdminPageHeader title='评论' description='读者在文章段落下留下的评论。' />

      {isLoading ? (
        <TableCard>
          <TableSkeleton rows={6} cols={4} />
        </TableCard>
      ) : error ? (
        <ErrorText error={error} />
      ) : comments.data ? (
        <>
          <StatGrid>
            <StatCard title='今日' value={countByDay(comments.data, 0)} />
            <StatCard title='本月' value={countThisMonth(comments.data)} />
            <StatCard title='总计' value={comments.data.length} />
          </StatGrid>
          <TableCard>
            {all.length > 0 ? (
              <ListToolbar className='border-border-light border-b p-2 sm:px-3'>
                <SearchBox value={state.q} onChange={(q) => set({ q })} placeholder='搜索用户、评论内容或文章' />
                <FilterPopover active={state.type ? 1 : 0} onReset={() => set({ type: '' })}>
                  <FilterChoice
                    label='评论类型'
                    anyLabel='全部'
                    value={state.type}
                    onChange={(type) => set({ type })}
                    options={[
                      { value: 'top', label: '顶层评论', count: all.length - replyCount },
                      { value: 'reply', label: '回复', count: replyCount },
                    ]}
                  />
                </FilterPopover>
              </ListToolbar>
            ) : null}
            {all.length === 0 ? (
              <EmptyState icon={MessageSquare} title='还没有评论' body='读者在文章段落下留下的评论会出现在这里。' />
            ) : filtered.length === 0 ? (
              <EmptyState icon={MessageSquare} title='没有匹配的评论' action={<Button size='sm' onClick={() => set({ q: '', type: '' })}>清除筛选</Button>} />
            ) : (
              <>
                <DataTable columns={columns} data={slice.rows} getRowId={(comment) => String(comment.id)} caption='评论' />
                <PageFooter slice={slice} onPage={(page) => set({ page })} onSize={(size) => set({ size })} />
              </>
            )}
          </TableCard>
        </>
      ) : null}
    </AdminPage>
  );
}

function authorName(comment: CommentRecord): string {
  return comment.userInfo ? parseDisplayName(comment.userInfo) : comment.userId;
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
