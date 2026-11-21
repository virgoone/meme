import { displayImageUrl } from '../lib/media-url';
/**
 * Article list in Sluice's list pattern (sluice/web/src/pages/admin/upstreams.tsx):
 * PageHeader with one primary action; a TableCard holding the ListToolbar (search +
 * the 筛选 popover), the DataTable and the PageFooter; EmptyState for no articles
 * and for no matches. Search, status, page and size live in the URL. Unlike
 * Sluice's client-side lists, the query runs on the server (/api/admin/post-list),
 * because the archive is longer than one response.
 */
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { ExternalLink, FileText, Pencil, Plus } from 'lucide-react';

import { type AdminPostPage, type BlogPost, useAdminPostPage } from '../lib/admin-queries';
import { ErrorText } from '../lib/admin-ui';
import { formatDate, moodLabel } from '../lib/format';
import { type Column, DataTable, TableSkeleton } from '../lib/sluice/data-table';
import { FilterChoice, FilterPopover, ListToolbar, PageFooter, SearchBox, serverSlice, useUrlList } from '../lib/sluice/list-controls';
import { Badge, Button, EmptyState, PageHeader, TableCard } from '../lib/sluice/ui';

export const Route = createFileRoute('/admin/content/blog')({
  component: AdminBlogContentPage,
});

const LIST_KEYS = ['status'] as const;

function AdminBlogContentPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== '/admin/content/blog') return <Outlet />;
  return <ArticleList />;
}

function ArticleList() {
  const navigate = useNavigate();
  const { state, set } = useUrlList(LIST_KEYS);
  const status = state.status === 'published' || state.status === 'draft' ? state.status : '';
  const posts = useAdminPostPage({ q: state.q.trim(), status, page: state.page, size: state.size });
  const data = posts.data;
  const filtered = !!state.q.trim() || !!status;
  const clear = () => set({ q: '', status: '' });

  const columns: Column<BlogPost>[] = [
    {
      id: 'title',
      header: '标题',
      cell: (post) => (
        <div className='flex min-w-0 items-center gap-3'>
          <span className='hidden h-9 w-14 shrink-0 overflow-hidden rounded-ui-xs border border-border-light bg-fill-weak sm:block' aria-hidden='true'>
            {post.coverImageUrl ? <img src={displayImageUrl(post.coverImageUrl)} alt='' loading='lazy' className='size-full object-cover' /> : null}
          </span>
          <div className='min-w-0'>
            <Link to='/admin/content/blog/$slug' params={{ slug: post.slug }} className='block truncate font-medium text-title hover:underline'>
              {post.title}
            </Link>
            <span className='block truncate font-code text-description type-sm'>/{post.slug}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: '状态',
      className: 'w-[88px]',
      cell: (post) => (post.publishedAt ? <Badge tone='ok'>已发布</Badge> : <Badge tone='neutral'>草稿</Badge>),
    },
    {
      id: 'publishedAt',
      header: '发布时间',
      hideOnMobile: true,
      className: 'w-[140px] whitespace-nowrap',
      cell: (post) => <span className={post.publishedAt ? 'text-body' : 'text-helper'}>{post.publishedAt ? formatDate(post.publishedAt) : '—'}</span>,
    },
    {
      id: 'views',
      header: '浏览',
      hideOnMobile: true,
      className: 'w-[80px] text-right tabular-nums',
      cell: (post) => (post.views ?? 0).toLocaleString('zh-CN'),
    },
    {
      id: 'meta',
      header: '心情 · 阅读',
      hideOnMobile: true,
      className: 'w-[120px] whitespace-nowrap',
      cell: (post) => <span className='text-subtitle'>{moodLabel(post.mood)} · {Math.round(post.readingTime ?? 0)} 分钟</span>,
    },
    {
      id: 'actions',
      header: <span className='sr-only'>操作</span>,
      className: 'w-[84px]',
      cell: (post) => (
        <div className='flex justify-end gap-1'>
          {post.publishedAt ? (
            <Button asChild size='icon-sm' variant='ghost' aria-label={`查看「${post.title}」`} title='查看'>
              <Link to='/$slug' params={{ slug: post.slug }} target='_blank'><ExternalLink /></Link>
            </Button>
          ) : null}
          <Button asChild size='icon-sm' variant='ghost' aria-label={`编辑「${post.title}」`} title='编辑'>
            <Link to='/admin/content/blog/$slug' params={{ slug: post.slug }}><Pencil /></Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='博客文章'
        description='撰写新文章，管理正文、封面和发布状态。'
        actions={
          <Button asChild variant='primary'>
            <Link to='/admin/content/blog/new'><Plus />写文章</Link>
          </Button>
        }
      />
      <TableCard>
        <ListToolbar className='border-border-light border-b p-2 sm:px-3'>
          <SearchBox value={state.q} onChange={(q) => set({ q })} placeholder='搜索标题、链接或摘要' />
          <FilterPopover active={status ? 1 : 0} onReset={() => set({ status: '' })}>
            <FilterChoice
              label='发布状态'
              anyLabel='全部'
              value={status}
              onChange={(next) => set({ status: next })}
              options={[
                { value: 'published', label: '已发布', count: data?.counts.published },
                { value: 'draft', label: '草稿', count: data?.counts.draft },
              ]}
            />
          </FilterPopover>
        </ListToolbar>
        {posts.isPending ? (
          <TableSkeleton rows={6} cols={5} />
        ) : posts.isError ? (
          <div className='p-4'><ErrorText error={posts.error} /></div>
        ) : data && data.items.length === 0 ? (
          filtered ? (
            <EmptyState icon={FileText} title='没有匹配的文章' body='换个关键词，或清除筛选。' action={<Button size='sm' onClick={clear}>清除筛选</Button>} />
          ) : (
            <EmptyState icon={FileText} title='还没有文章' body='写下第一篇，保存为草稿或直接发布。' action={<Button asChild size='sm' variant='primary'><Link to='/admin/content/blog/new'><Plus />写文章</Link></Button>} />
          )
        ) : data ? (
          <ArticleTable data={data} columns={columns} onOpen={(post) => void navigate({ to: '/admin/content/blog/$slug', params: { slug: post.slug } })} onPage={(page) => set({ page })} onSize={(size) => set({ size, page: 1 })} />
        ) : null}
      </TableCard>
    </>
  );
}

function ArticleTable({ data, columns, onOpen, onPage, onSize }: {
  data: AdminPostPage;
  columns: Column<BlogPost>[];
  onOpen: (post: BlogPost) => void;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  return (
    <>
      <DataTable columns={columns} data={data.items} getRowId={(post) => post.id} onRowClick={onOpen} caption='博客文章' />
      <PageFooter slice={serverSlice(data.items, data.total, data.page, data.pageSize)} onPage={onPage} onSize={onSize} />
    </>
  );
}
