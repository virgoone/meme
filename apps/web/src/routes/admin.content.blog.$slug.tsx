import { displayImageUrl } from '../lib/media-url';
import { withStableBlockIds, type EditorBlockNode } from '@meme/editor';
import { createPostSlug, isValidPostSlug } from '@meme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useAdminPost, type PostDetail } from '../lib/admin-queries';
import { ErrorText } from '../lib/admin-ui';
import { Badge, Button, Field, Input, NativeSelect, Skeleton, Textarea } from '../lib/sluice/ui';
import { CoverGenerator } from '../lib/cover-generator';
import { MainImageUploader } from '../lib/main-image-uploader';
import { postToEditorValue } from '../lib/post-editor-value';
import { RemoteEditorWidget, type RemoteEditorValue } from '../lib/remote-editor-widget';
import '../lib/post-editor.css';

export const Route = createFileRoute('/admin/content/blog/$slug')({
  component: () => <AdminBlogEditorPage slug={Route.useParams().slug} />,
});

type Mood = 'happy' | 'sad' | 'neutral';

export function AdminBlogEditorPage({ slug }: { slug?: string }) {
  const isNew = !slug;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const post = useAdminPost(slug ?? '');
  const [title, setTitle] = useState('');
  const [nextSlug, setNextSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [readingTime, setReadingTime] = useState('0');
  const [mood, setMood] = useState<Mood>('neutral');
  const [content, setContent] = useState<RemoteEditorValue>([]);
  const [contentReadySlug, setContentReadySlug] = useState<string | null>(null);

  const initialContent = useMemo(() => (post.data ? postToEditorValue(post.data) : []), [post.data]);

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
      if (!title.trim()) throw new Error('请输入文章标题');
      if (!isValidPostSlug(nextSlug.trim())) throw new Error('请填写有效的 Slug：文字、数字和短横线');
      const response = await fetch(isNew ? '/api/posts' : `/api/posts/${encodeURIComponent(slug)}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          slug: nextSlug,
          description: description.trim() || null,
          mainImageUrl: displayImageUrl(mainImageUrl.trim()) || null,
          publishedAt: fromDateTimeLocal(publishedAt),
          readingTime: Number(readingTime) || null,
          mood,
          slateJson: withStableBlockIds(content as unknown as EditorBlockNode[]),
        }),
      });
      const payload = (await response.json()) as PostDetail & { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.message ?? payload.error ?? response.statusText);
      return payload as PostDetail;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'post', saved.slug], saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'blog-posts'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'posts'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'post'] });
      if (saved.slug !== slug) {
        void navigate({ to: '/admin/content/blog/$slug', params: { slug: saved.slug }, replace: true });
      }
    },
  });

  const saving = saveMutation.isPending;
  const savedCover = isNew ? '' : (post.data?.mainImageUrl ?? post.data?.coverImageUrl ?? '');
  const coverChanged = mainImageUrl.trim() !== savedCover;

  if (!isNew && post.isPending) {
    return (
      <div className='admin-post-editor flex flex-col gap-6' role='status' aria-label='文章加载中'>
        <EditorHeader isNew={false} title='' saving={false} onSave={() => undefined} />
        <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_336px]'>
          <div className='grid gap-4'>
            <Skeleton className='h-10 w-3/4' />
            <Skeleton className='h-9 w-1/2' />
            <Skeleton className='h-[560px] w-full rounded-ui-xl' />
          </div>
          <Skeleton className='h-[480px] w-full rounded-ui-xl' />
        </div>
      </div>
    );
  }

  if (!isNew && (post.isError || !post.data)) {
    return (
      <div className='admin-post-editor flex flex-col gap-6'>
        <EditorHeader isNew={false} title='编辑文章' saving={false} onSave={() => undefined} />
        <ErrorText error={post.error ?? new Error('文章不存在')} />
      </div>
    );
  }

  return (
    <div className='admin-post-editor flex flex-col gap-6'>
      <EditorHeader
        isNew={isNew}
        title={title}
        published={!!publishedAt}
        saving={saving}
        previewSlug={!isNew && post.data?.publishedAt ? post.data.slug : undefined}
        onSave={() => saveMutation.mutate()}
        status={saveMutation.isSuccess ? '已保存' : null}
        error={saveMutation.isError ? saveMutation.error : null}
      />

      <div className='grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_336px]'>
        <div className='flex min-w-0 flex-col gap-4'>
          <label htmlFor='post-title' className='sr-only'>标题</label>
          <input
            id='post-title'
            value={title}
            placeholder='文章标题'
            className='admin-post-title'
            onChange={(event) => {
              setTitle(event.target.value);
              if (isNew && !slugEdited) setNextSlug(createPostSlug(event.target.value));
            }}
          />
          <div className='grid items-start gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]'>
            <Field label='Slug' htmlFor='post-slug' hint={<span className='break-all'>公开地址：/{nextSlug || '…'}</span>}>
              <Input id='post-slug' inputSize='md' value={nextSlug} className='font-code type-sm' placeholder='url-friendly-slug' onChange={(event) => { setNextSlug(event.target.value); setSlugEdited(true); }} />
            </Field>
            <Field label='摘要' htmlFor='post-description' hint='用于列表、RSS 和分享卡片。'>
              <Textarea id='post-description' value={description} rows={2} className='min-h-9 py-2' placeholder='一两句话说明这篇文章讲什么' onChange={(event) => setDescription(event.target.value)} />
            </Field>
          </div>

          <section aria-label='正文' className='min-w-0 overflow-hidden rounded-ui-xl border border-border-light bg-surface'>
            {isNew || contentReadySlug === post.data?.slug ? (
              <RemoteEditorWidget value={content} onChange={setContent} className='admin-editor-host' minHeight={640} />
            ) : (
              <div className='admin-editor-host' role='status' aria-label='编辑器加载中' style={{ minHeight: 640 }}>
                <div className='editor-widget-loading'>
                  <div className='editor-widget-skeleton' aria-hidden='true'>
                    <div className='editor-widget-skeleton__toolbar'>{Array.from({ length: 8 }).map((_, index) => <span key={index} />)}</div>
                    <div className='editor-widget-skeleton__body'><span className='wide' /><span /><span className='short' /><span className='wide' /><span /></div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className='min-w-0 divide-y divide-border-light rounded-ui-xl border border-border-light bg-surface' aria-label='文章设置'>
          <SidePanel title='发布' action={publishedAt ? <Badge tone='ok'>已发布</Badge> : <Badge>草稿</Badge>}>
            <Field label='发布时间' htmlFor='post-published-at' hint='留空保存为草稿，前台不会展示。'>
              <Input id='post-published-at' type='datetime-local' value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
            </Field>
            <Button variant='primary' className='w-full' loading={saving} onClick={() => saveMutation.mutate()}>
              {saving ? '保存中…' : publishedAt ? '保存并发布' : '保存草稿'}
            </Button>
            {saveMutation.isError ? <ErrorText error={saveMutation.error} className='type-sm' /> : null}
          </SidePanel>

          <SidePanel title='封面图' action={coverChanged ? <Badge tone='warn'>未保存</Badge> : null}>
            <MainImageUploader value={mainImageUrl} onChange={setMainImageUrl} />
          </SidePanel>

          <SidePanel title='生成封面' description='提示词发送到 Sluice，图片存入站点媒体库。'>
            <CoverGenerator title={title} description={description} currentCover={mainImageUrl} onAdopt={setMainImageUrl} />
          </SidePanel>

          <SidePanel title='元信息'>
            <Field label='心情' htmlFor='post-mood'>
              <NativeSelect id='post-mood' value={mood} onChange={(event) => setMood(event.target.value as Mood)}>
                <option value='neutral'>日常</option>
                <option value='happy'>开心</option>
                <option value='sad'>低落</option>
              </NativeSelect>
            </Field>
            <Field label='阅读时长（分钟）' htmlFor='post-reading-time'>
              <Input id='post-reading-time' inputMode='numeric' value={readingTime} onChange={(event) => setReadingTime(event.target.value)} />
            </Field>
          </SidePanel>
        </aside>
      </div>
    </div>
  );
}

/** One section of the settings column (Sluice Block typography, hairline-separated). */
function SidePanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className='flex min-w-0 flex-col gap-3 p-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='min-w-0'>
          <h2 className='font-medium text-title type-md'>{title}</h2>
          {description ? <p className='mt-0.5 font-desc text-description type-sm'>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Page header in Sluice's PageHeader layout, with a back button and the save actions. */
function EditorHeader({ isNew, title, published, saving, previewSlug, onSave, status, error }: {
  isNew: boolean;
  title: string;
  published?: boolean;
  saving: boolean;
  previewSlug?: string;
  onSave: () => void;
  status?: string | null;
  error?: unknown;
}) {
  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
      <div className='flex min-w-0 items-start gap-3'>
        <Button asChild size='icon-sm' variant='ghost' className='mt-0.5'>
          <Link to='/admin/content/blog' aria-label='返回文章列表'><ArrowLeft /></Link>
        </Button>
        <div className='flex min-w-0 flex-col gap-1'>
          <div className='flex items-center gap-2 text-description type-sm'>
            {isNew ? '新文章' : '编辑文章'}
            {!isNew && published !== undefined ? (published ? <Badge tone='ok'>已发布</Badge> : <Badge>草稿</Badge>) : null}
          </div>
          <h1 className='min-w-0 truncate font-medium text-title type-2xl tracking-[-0.01em]'>{title || (isNew ? '未命名文章' : '加载中…')}</h1>
        </div>
      </div>
      <div className='flex shrink-0 flex-wrap items-center gap-2 sm:pt-0.5'>
        {error ? <ErrorText error={error} className='type-sm' /> : status ? <span className='font-desc text-description type-sm'>{status}</span> : null}
        {previewSlug ? (
          <Button asChild>
            <Link to='/$slug' params={{ slug: previewSlug }} target='_blank'><ExternalLink />预览</Link>
          </Button>
        ) : null}
        <Button variant='primary' loading={saving} onClick={onSave}>{saving ? '保存中…' : '保存'}</Button>
      </div>
    </div>
  );
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
