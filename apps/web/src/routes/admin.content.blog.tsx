import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { DataTableSkeleton } from '@bunship-ai/data-table';
import { Badge } from '@bunship-ai/ui/components/badge';
import { Button } from '@bunship-ai/ui/components/button';

import { useAdminBlogPosts, type BlogPost } from '../lib/admin-queries';
import { AdminPage, AdminPageHeader, type DataTableColumn, ErrorText, SimpleDataTable, StatCard, StatGrid } from '../lib/admin-ui';
import { formatDate, moodLabel } from '../lib/format';

export const Route = createFileRoute('/admin/content/blog')({
  component: AdminBlogContentPage,
});

const columns: DataTableColumn<BlogPost>[] = [
  {
    id: 'title',
    header: '标题',
    size: 520,
    minSize: 360,
    cell: (post) => (
      <div className='flex min-w-0 items-center gap-3'>
        <span className='block h-10 w-14 shrink-0 overflow-hidden rounded border border-border bg-muted' aria-hidden='true'>
          {post.coverImageUrl ? <img src={post.coverImageUrl} alt='' className='size-full object-cover' /> : null}
        </span>
        <span className='grid min-w-0 gap-0.5'>
          <Link to='/admin/content/blog/$slug' params={{ slug: post.slug }} className='truncate font-medium text-sm hover:underline'>
            {post.title}
          </Link>
          <span className='truncate text-muted-foreground text-xs'>{post.description ?? post.slug}</span>
        </span>
      </div>
    ),
  },
  {
    id: 'status',
    header: '状态',
    size: 100,
    cell: (post) => (
      <Badge variant={post.publishedAt ? 'default' : 'outline'}>{post.publishedAt ? '已发布' : '草稿'}</Badge>
    ),
  },
  {
    id: 'publishedAt',
    header: '发布时间',
    size: 150,
    cell: (post) => <span className='text-muted-foreground text-sm'>{formatDate(post.publishedAt)}</span>,
  },
  {
    id: 'meta',
    header: '信息',
    size: 140,
    cell: (post) => <span className='text-muted-foreground text-sm'>{moodLabel(post.mood)} · {Math.round(post.readingTime ?? 0)} 分钟</span>,
  },
  {
    id: 'actions',
    header: '',
    size: 140,
    cell: (post) => (
      <div className='flex justify-end gap-1'>
        <Button asChild variant='ghost' size='sm'>
          <Link to='/$slug' params={{ slug: post.slug }}>查看</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link to='/admin/content/blog/$slug' params={{ slug: post.slug }}>编辑</Link>
        </Button>
      </div>
    ),
  },
];

function AdminBlogContentPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const posts = useAdminBlogPosts();

  if (pathname !== '/admin/content/blog') {
    return <Outlet />;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title='博客文章'
        description='撰写新文章，管理正文、封面和发布时间。'
        action={
          <Button asChild>
            <Link to='/admin/content/blog/new'><Plus aria-hidden='true' />新增文章</Link>
          </Button>
        }
      />

      {posts.isPending ? (
        <DataTableSkeleton columnCount={5} rowCount={10} />
      ) : posts.isError ? (
        <ErrorText error={posts.error} />
      ) : posts.data ? (
        <>
          <StatGrid>
            <StatCard title='文章总数' value={posts.data.length} />
            <StatCard title='已发布' value={posts.data.filter((post) => post.publishedAt).length} />
            <StatCard title='草稿' value={posts.data.filter((post) => !post.publishedAt).length} />
            <StatCard title='最近发布' value={formatDate(posts.data.find((post) => post.publishedAt)?.publishedAt ?? null)} />
          </StatGrid>
          <SimpleDataTable columns={columns} data={posts.data} getRowId={(post) => post.id} pageSize={20} />
        </>
      ) : null}
    </AdminPage>
  );
}
