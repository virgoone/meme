import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';

import { DataTableSkeleton } from '@bunship-ai/data-table';

import { useAdminBlogPosts, type BlogPost } from '../lib/admin-queries';
import {
  AdminPageHeader,
  type DataTableColumn,
  SimpleDataTable,
  StatCard,
} from '../lib/admin-ui';
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
      <div className='admin-blog-title-cell'>
        <span className='admin-post-thumb' aria-hidden='true'>
          {post.coverImageUrl ? <img src={post.coverImageUrl} alt='' /> : null}
        </span>
        <span className='admin-blog-title-cell__content'>
          <strong>{post.title}</strong>
          <span>{post.description ?? post.slug}</span>
        </span>
      </div>
    ),
  },
  {
    id: 'status',
    header: '状态',
    size: 96,
    cell: (post) => (
      <span className={`admin-pill${post.publishedAt ? ' is-live' : ''}`}>
        {post.publishedAt ? '已发布' : '草稿'}
      </span>
    ),
  },
  {
    id: 'publishedAt',
    header: '发布时间',
    size: 148,
    cell: (post) => formatDate(post.publishedAt),
  },
  {
    id: 'meta',
    header: '信息',
    size: 150,
    cell: (post) =>
      `${moodLabel(post.mood)} · ${Math.round(post.readingTime ?? 0)} 分钟`,
  },
  {
    id: 'actions',
    header: '操作',
    size: 132,
    cell: (post) => (
      <div className='admin-table-actions'>
        <Link className='admin-row-action' to='/$slug' params={{ slug: post.slug }}>
          查看
        </Link>
        <Link
          className='admin-row-action is-primary'
          to='/admin/content/blog/$slug'
          params={{ slug: post.slug }}
        >
          编辑
        </Link>
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
    <section className='admin-page'>
      <AdminPageHeader
        title='博客内容'
        description='迁移后的文章内容，使用站内编辑器维护正文和 blockID。'
      />

      {posts.isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={10} />
      ) : posts.isError ? (
        <p className='admin-error'>
          {posts.error instanceof Error ? posts.error.message : String(posts.error)}
        </p>
      ) : posts.data ? (
        <>
          <div className='admin-stat-grid'>
            <StatCard title='文章总数' value={posts.data.length} />
            <StatCard
              title='已发布'
              value={posts.data.filter((post) => post.publishedAt).length}
            />
            <StatCard title='数据源' value='D1' />
          </div>

          <div className='admin-table-card'>
            <div className='admin-table-card__header'>
              <div>
                <h2>内容列表</h2>
                <p>按发布日期维护文章，封面、摘要和阅读信息会同步到前台卡片。</p>
              </div>
            </div>
            <SimpleDataTable
              columns={columns}
              data={posts.data}
              getRowId={(post) => post.id}
              empty='还没有导入博客文章。'
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
