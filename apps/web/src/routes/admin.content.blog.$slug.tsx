import { withStableBlockIds, type EditorBlockNode } from '@meme/editor';
import { createPostSlug, isValidPostSlug } from '@meme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@bunship-ai/ui/components/badge';
import { Button } from '@bunship-ai/ui/components/button';
import { Input } from '@bunship-ai/ui/components/input';
import { Label } from '@bunship-ai/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@bunship-ai/ui/components/select';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { Textarea } from '@bunship-ai/ui/components/textarea';

import { useAdminPost, type PostDetail } from '../lib/admin-queries';
import { AdminPage, ErrorText, SectionCard } from '../lib/admin-ui';
import { MainImageUploader } from '../lib/main-image-uploader';
import { postToEditorValue } from '../lib/post-editor-value';
import { RemoteEditorWidget, type RemoteEditorValue } from '../lib/remote-editor-widget';

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
          mainImageUrl: mainImageUrl.trim() || null,
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

  if (!isNew && post.isPending) {
    return (
      <AdminPage>
        <EditorToolbar isNew={false} title='' saving={false} onSave={() => undefined} />
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]'>
          <div className='grid gap-6'>
            <Skeleton className='h-12 w-3/4' />
            <Skeleton className='h-10 w-1/2' />
            <Skeleton className='h-[560px] w-full' />
          </div>
          <div className='grid gap-4'>
            <Skeleton className='h-32 w-full' />
            <Skeleton className='h-56 w-full' />
            <Skeleton className='h-48 w-full' />
          </div>
        </div>
      </AdminPage>
    );
  }

  if (!isNew && (post.isError || !post.data)) {
    return (
      <AdminPage>
        <EditorToolbar isNew={false} title='编辑文章' saving={false} onSave={() => undefined} />
        <ErrorText error={post.error ?? new Error('文章不存在')} />
      </AdminPage>
    );
  }

  const saving = saveMutation.isPending;
  const status = saveMutation.isSuccess ? '已保存' : saveMutation.isError ? null : null;

  return (
    <AdminPage>
      <EditorToolbar
        isNew={isNew}
        title={title}
        saving={saving}
        previewSlug={!isNew && post.data?.publishedAt ? post.data.slug : undefined}
        onSave={() => saveMutation.mutate()}
        status={status}
        error={saveMutation.isError ? saveMutation.error : null}
      />

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]'>
        <div className='grid min-w-0 gap-6'>
          <div className='grid gap-4'>
            <div className='grid gap-1.5'>
              <Label htmlFor='post-title' className='sr-only'>标题</Label>
              <Input
                id='post-title'
                value={title}
                placeholder='文章标题'
                className='h-auto min-h-0 rounded-none border-0 border-border border-b bg-transparent px-0 py-2 font-semibold text-2xl leading-snug shadow-none focus-visible:border-foreground focus-visible:ring-0'
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (isNew && !slugEdited) setNextSlug(createPostSlug(event.target.value));
                }}
              />
            </div>
            <div className='grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]'>
              <div className='grid gap-1.5'>
                <Label htmlFor='post-slug' className='text-muted-foreground text-xs'>Slug</Label>
                <Input
                  id='post-slug'
                  value={nextSlug}
                  className='font-mono text-[13px]'
                  placeholder='url-friendly-slug'
                  onChange={(event) => { setNextSlug(event.target.value); setSlugEdited(true); }}
                />
                <span className='text-muted-foreground text-xs'>公开地址：/{nextSlug || '…'}</span>
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='post-description' className='text-muted-foreground text-xs'>摘要</Label>
                <Textarea
                  id='post-description'
                  value={description}
                  rows={2}
                  className='min-h-[38px]'
                  placeholder='一两句话说明这篇文章讲什么，用于列表、RSS 和分享卡片。'
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          </div>

          <SectionCard title='正文' description='段落会以稳定的 block ID 保存，用作评论锚点。' bodyClassName='p-0'>
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
          </SectionCard>
        </div>

        <aside className='grid content-start gap-4' aria-label='文章设置'>
          <SectionCard title='发布' action={<Badge variant={publishedAt ? 'default' : 'outline'}>{publishedAt ? '已发布' : '草稿'}</Badge>}>
            <div className='grid gap-3'>
              <div className='grid gap-1.5'>
                <Label htmlFor='post-published-at' className='text-muted-foreground text-xs'>发布时间</Label>
                <Input id='post-published-at' type='datetime-local' value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
                <span className='text-muted-foreground text-xs'>留空保存为草稿，前台不会展示。</span>
              </div>
              <Button className='w-full' disabled={saving} onClick={() => saveMutation.mutate()}>
                {saving ? '保存中…' : publishedAt ? '保存并发布' : '保存草稿'}
              </Button>
              {saveMutation.isSuccess ? <span className='text-center text-muted-foreground text-xs'>已保存</span> : null}
              {saveMutation.isError ? <ErrorText error={saveMutation.error} className='text-xs' /> : null}
            </div>
          </SectionCard>

          <SectionCard title='封面图'>
            <MainImageUploader value={mainImageUrl} onChange={setMainImageUrl} />
          </SectionCard>

          <SectionCard title='元信息'>
            <div className='grid gap-4'>
              <div className='grid gap-1.5'>
                <Label htmlFor='post-mood' className='text-muted-foreground text-xs'>心情</Label>
                <Select value={mood} onValueChange={(value) => setMood(value as Mood)}>
                  <SelectTrigger id='post-mood'><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='neutral'>日常</SelectItem>
                    <SelectItem value='happy'>开心</SelectItem>
                    <SelectItem value='sad'>低落</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor='post-reading-time' className='text-muted-foreground text-xs'>阅读时长（分钟）</Label>
                <Input id='post-reading-time' inputMode='numeric' value={readingTime} onChange={(event) => setReadingTime(event.target.value)} />
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </AdminPage>
  );
}

function EditorToolbar({ isNew, title, saving, previewSlug, onSave, status, error }: {
  isNew: boolean;
  title: string;
  saving: boolean;
  previewSlug?: string;
  onSave: () => void;
  status?: string | null;
  error?: unknown;
}) {
  return (
    <header className='flex flex-wrap items-center justify-between gap-3 border-border border-b pb-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <Button asChild variant='ghost' size='icon' className='size-8 shrink-0'>
          <Link to='/admin/content/blog' aria-label='返回文章列表'><ArrowLeft aria-hidden='true' /></Link>
        </Button>
        <div className='grid min-w-0 gap-0.5'>
          <span className='text-muted-foreground text-xs'>{isNew ? '新文章' : '编辑文章'}</span>
          <h1 className='truncate font-semibold text-base leading-tight'>{title || (isNew ? '未命名文章' : '加载中…')}</h1>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        {error ? <ErrorText error={error} className='text-xs' /> : status ? <span className='text-muted-foreground text-xs'>{status}</span> : null}
        {previewSlug ? (
          <Button asChild variant='outline' size='sm'>
            <Link to='/$slug' params={{ slug: previewSlug }} target='_blank'><ExternalLink aria-hidden='true' />预览</Link>
          </Button>
        ) : null}
        <Button size='sm' disabled={saving} onClick={onSave}>{saving ? '保存中…' : '保存'}</Button>
      </div>
    </header>
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
