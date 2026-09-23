import { withStableBlockIds, type EditorBlockNode } from '@meme/editor';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { usePost, type PostDetail } from '../lib/admin-queries';
import { AdminPageHeader } from '../lib/admin-ui';
import { MainImageUploader } from '../lib/main-image-uploader';
import {
  RemoteEditorWidget,
  type RemoteEditorValue,
} from '../lib/remote-editor-widget';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';

export const Route = createFileRoute('/admin/content/blog/$slug')({
  component: AdminBlogEditorPage,
});

function AdminBlogEditorPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const post = usePost(slug);
  const [title, setTitle] = useState('');
  const [nextSlug, setNextSlug] = useState('');
  const [description, setDescription] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [readingTime, setReadingTime] = useState('0');
  const [mood, setMood] = useState<'happy' | 'sad' | 'neutral'>('neutral');
  const [content, setContent] = useState<RemoteEditorValue>([]);
  const [contentReadySlug, setContentReadySlug] = useState<string | null>(null);

  const initialContent = useMemo(() => {
    if (!post.data) return [];
    return postToEditorValue(post.data);
  }, [post.data]);

  useEffect(() => {
    if (!post.data) return;
    setTitle(post.data.title);
    setNextSlug(post.data.slug);
    setDescription(post.data.description ?? '');
    setMainImageUrl(post.data.mainImageUrl ?? post.data.coverImageUrl ?? '');
    setPublishedAt(toDateTimeLocal(post.data.publishedAt));
    setReadingTime(String(Math.round(post.data.readingTime ?? 0)));
    setMood(post.data.mood ?? 'neutral');
    setContent(initialContent);
    setContentReadySlug(post.data.slug);
  }, [initialContent, post.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug: nextSlug,
          description: description.trim() || null,
          mainImageUrl: mainImageUrl.trim() || null,
          publishedAt: fromDateTimeLocal(publishedAt),
          readingTime: Number(readingTime) || null,
          mood,
          slateJson: withStableBlockIds(content as unknown as EditorBlockNode[]),
        }),
      });

      const payload = (await response.json()) as PostDetail | { error?: string };
      if (!response.ok) {
        throw new Error('error' in payload ? payload.error : response.statusText);
      }
      return payload as PostDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public', 'post', slug] });
      if (nextSlug !== slug) {
        void navigate({
          to: '/admin/content/blog/$slug',
          params: { slug: nextSlug },
          replace: true,
        });
      }
    },
  });

  if (post.isPending) {
    return (
      <section className='admin-page admin-editor-page'>
        <AdminPageHeader title='编辑博客' description='加载文章内容。' />
        <div className='admin-form admin-editor-meta admin-editor-meta--skeleton'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-24 w-full' />
          <div className='main-image-uploader-skeleton'>
            <Skeleton className='h-full w-full' />
          </div>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
        <div className='admin-card admin-editor-card'>
          <div className='admin-card__header'>
            <Skeleton className='h-5 w-20' />
          </div>
          <div className='admin-editor-skeleton'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-5 w-3/4' />
            <Skeleton className='h-5 w-5/6' />
            <Skeleton className='h-5 w-2/3' />
          </div>
        </div>
      </section>
    );
  }

  if (post.isError || !post.data) {
    return (
      <section className='admin-page'>
        <AdminPageHeader title='编辑博客' description='加载文章内容。' />
        <p className='admin-error'>
          {post.error instanceof Error ? post.error.message : String(post.error)}
        </p>
      </section>
    );
  }

  return (
    <section className='admin-page admin-editor-page'>
      <AdminPageHeader
        title={title || '编辑博客'}
        description='维护文章内容、封面和发布信息，保存时保留 blockID。'
        action={
          <div className='admin-editor-header-actions'>
            <Link
              className='admin-button secondary'
              to='/admin/content/blog'
            >
              返回列表
            </Link>
            <Link
              className='admin-button secondary'
              to='/$slug'
              params={{ slug: nextSlug || slug }}
            >
              预览
            </Link>
            <button
              type='button'
              className='admin-button'
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        }
      />

      <div className='admin-editor-workbench'>
        <main className='admin-editor-canvas'>
          <section className='admin-editor-panel admin-editor-title-panel'>
            <label className='admin-field admin-field--title'>
              <span>标题</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className='admin-editor-title-grid'>
              <label className='admin-field'>
                <span>Slug</span>
                <input
                  value={nextSlug}
                  onChange={(event) => setNextSlug(event.target.value)}
                />
              </label>
              <label className='admin-field'>
                <span>描述</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className='admin-card admin-editor-card'>
            <div className='admin-card__header'>
              <div>
                <h2>正文</h2>
                <p>富文本内容会以稳定 blockID 保存，用于评论锚点。</p>
              </div>
            </div>
            {contentReadySlug === post.data.slug ? (
              <RemoteEditorWidget
                value={content}
                onChange={setContent}
                className='admin-plate-editor'
                minHeight={640}
              />
            ) : (
              <div className='admin-editor-loading' role='status' aria-label='编辑器加载中'>
                <div className='editor-widget-skeleton' aria-hidden='true'>
                  <div className='editor-widget-skeleton__toolbar'>
                    {Array.from({ length: 8 }).map((_, index) => (
                      <span key={index} />
                    ))}
                  </div>
                  <div className='editor-widget-skeleton__body'>
                    <span className='wide' />
                    <span />
                    <span className='short' />
                    <span className='wide' />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>

        <aside className='admin-editor-inspector' aria-label='文章设置'>
          <section className='admin-inspector-card admin-inspector-card--status'>
            <div className='admin-inspector-card__header'>
              <span>发布</span>
              <span className={`admin-pill${publishedAt ? ' is-live' : ''}`}>
                {publishedAt ? '已发布' : '草稿'}
              </span>
            </div>
            <button
              type='button'
              className='admin-button'
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? '保存中...' : '保存更改'}
            </button>
            {saveMutation.isSuccess ? (
              <span className='admin-save-note'>已保存</span>
            ) : null}
            {saveMutation.isError ? (
              <span className='admin-error'>
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : String(saveMutation.error)}
              </span>
            ) : null}
          </section>

          <section className='admin-inspector-card'>
            <div className='admin-inspector-card__header'>
              <span>主图</span>
            </div>
            <MainImageUploader value={mainImageUrl} onChange={setMainImageUrl} />
          </section>

          <section className='admin-inspector-card'>
            <div className='admin-inspector-card__header'>
              <span>元信息</span>
            </div>
            <label className='admin-field'>
              <span>心情</span>
              <select
                className='admin-select'
                value={mood}
                onChange={(event) =>
                  setMood(event.target.value as 'happy' | 'sad' | 'neutral')
                }
              >
                <option value='neutral'>日常</option>
                <option value='happy'>开心</option>
                <option value='sad'>低落</option>
              </select>
            </label>
            <label className='admin-field'>
              <span>阅读时长（分钟）</span>
              <input
                inputMode='numeric'
                value={readingTime}
                onChange={(event) => setReadingTime(event.target.value)}
              />
            </label>
            <label className='admin-field'>
              <span>发布时间</span>
              <input
                type='datetime-local'
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </label>
          </section>
        </aside>
      </div>

      <div className='admin-editor-footer-actions'>
        <div>
          {saveMutation.isSuccess ? (
            <span className='admin-muted'>已保存</span>
          ) : null}
          {saveMutation.isError ? (
            <span className='admin-error'>
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : String(saveMutation.error)}
            </span>
          ) : null}
        </div>
        <button
          type='button'
          className='admin-button'
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </section>
  );
}

function postToEditorValue(post: PostDetail): RemoteEditorValue {
  const blocks = post.blocks ?? [];
  const fromPost = Array.isArray(post.slateJson) ? post.slateJson : null;
  const fromBlocks = blocks
    .map((block) =>
      block.slateJson && typeof block.slateJson === 'object'
        ? {
            ...(block.slateJson as EditorBlockNode),
            portableTextJson: block.portableTextJson,
          }
        : block.slateJson,
    )
    .filter((block): block is EditorBlockNode => Boolean(block));
  const result = (fromBlocks.length > 0 ? fromBlocks : fromPost ?? []) as EditorBlockNode[];
  return withStableBlockIds(result) as RemoteEditorValue;
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
