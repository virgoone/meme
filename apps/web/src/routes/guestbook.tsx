import { authClient, useSession } from '@meme/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import { publicGuestbookQueryOptions, usePublicGuestbook, type PublicGuestbookEntry } from '../lib/admin-queries';
import { AdBanner } from '../lib/adsense';
import { useAuthedFetch } from '../lib/auth';
import { openAuthDialog } from '../lib/auth-dialog-store';
import { CommentMarkdown } from '../lib/comment-markdown';
import { loadPublicQuery } from '../lib/route-query';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/guestbook')({
  head: () => pageHead('留言墙', '来 Koya 的博客交流技术、反馈文章或打个招呼。登录后即可留下留言。', '/guestbook'),
  loader: ({ context }) => loadPublicQuery(context.queryClient, publicGuestbookQueryOptions()),
  component: GuestbookPage,
});

const MAX_LENGTH = 600;

function GuestbookPage() {
  const entries = usePublicGuestbook();
  return (
    <section className='site-measure'>
      <header>
        <p className='site-kicker'>
          <span>留言墙</span>
          {entries.data ? <span>{entries.data.length} 条</span> : null}
        </p>
        <h1 className='site-title'>随便写点什么</h1>
        <p className='site-lead'>欢迎来打个招呼，支持 Markdown。</p>
      </header>

      <GuestbookComposer />

      {entries.isPending && <GuestbookSkeleton />}
      {entries.isError && (
        <p className='site-empty site-empty--error'>{entries.error instanceof Error ? entries.error.message : String(entries.error)}</p>
      )}
      {entries.data && entries.data.length === 0 && <p className='site-empty'>还没有留言，来做第一个吧。</p>}
      {entries.data && entries.data.length > 0 && (
        <ul className='guest-list'>
          {entries.data.map((entry, index) => <GuestbookItem key={entry.id} entry={entry} index={index} />)}
        </ul>
      )}
      {!!entries.data?.length && <AdBanner placement='guestbook' />}
    </section>
  );
}

function GuestbookComposer() {
  const { data, isPending } = useSession();
  const me = data?.user;
  const authedFetch = useAuthedFetch();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isPreviewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsName = !!me && !me.name?.trim();
  const trimmed = message.trim();
  const isActive = trimmed.length > 0;
  const isOverLimit = message.length > MAX_LENGTH;

  async function send() {
    if (!isActive || sending || isOverLimit || !me) return;
    if (needsName && !name.trim()) {
      setError('先填写一个公开昵称，再发送留言。');
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (needsName) {
        const updated = await authClient.updateUser({ name: name.trim() });
        if (updated.error) throw new Error(updated.error.message || '昵称保存失败，请重试。');
      }
      const response = await authedFetch('/api/guestbook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!response.ok) {
        throw new Error(response.status === 429 ? '发得太快了，稍后再试。' : '留言发送失败，请重试。');
      }
      const created = (await response.json().catch(() => null)) as PublicGuestbookEntry | null;
      queryClient.setQueryData<PublicGuestbookEntry[]>(['public', 'guestbook'], (current = []) => [
        created?.id != null ? created : {
          id: `local-${Date.now()}`,
          userId: me.id,
          userInfo: { name: me.name || name.trim(), imageUrl: me.image ?? null },
          message: trimmed,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setMessage('');
      setPreviewing(false);
      void queryClient.invalidateQueries({ queryKey: ['public', 'guestbook'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '留言发送失败，请重试。');
    } finally {
      setSending(false);
    }
  }

  if (isPending) {
    return (
      <div className='guest-composer' role='status' aria-label='留言表单加载中'>
        <span className='guest-avatar' aria-hidden='true' />
        <span className='skeleton-line skeleton-line--text' />
      </div>
    );
  }

  if (!me) {
    return (
      <div className='guest-composer guest-composer--signin'>
        <span className='guest-avatar' aria-hidden='true'>?</span>
        <div>
          <span>登录后即可留言。</span>
          <button type='button' className='site-button site-button--ghost' onClick={() => openAuthDialog('signin')}>
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='guest-composer'>
      <Avatar name={me.name ?? me.email ?? ''} image={me.image ?? null} />
      <div>
        {needsName && (
          <label className='guestbook-nickname'>
            <span>公开昵称</span>
            <input
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              placeholder='留言时显示的名字'
              disabled={sending}
              autoComplete='nickname'
            />
          </label>
        )}
        {isPreviewing ? (
          <div className='guest-composer__preview comment__message'>
            <CommentMarkdown>{message}</CommentMarkdown>
          </div>
        ) : (
          <TextareaAutosize
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder='说点什么吧，万一火不了呢…'
            minRows={2}
            maxRows={10}
            disabled={sending}
            aria-label='留言内容'
          />
        )}
        <div className='guest-composer__bar'>
          <span className={`guest-composer__count${isOverLimit ? ' is-danger' : ''}`}>
            {message.length} / {MAX_LENGTH}
          </span>
          {isActive ? (
            <button type='button' className='site-textlink' onClick={() => setPreviewing((value) => !value)}>
              {isPreviewing ? '继续编辑' : '预览'}
            </button>
          ) : null}
          {error ? <span className='site-status site-status--error' role='alert' style={{ margin: 0 }}>{error}</span> : null}
          <button
            type='button'
            className='site-button'
            disabled={sending || !isActive || isOverLimit}
            onClick={() => void send()}
            title='⌘ + Enter 发送'
          >
            {sending ? '发送中…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestbookItem({ entry, index }: { entry: PublicGuestbookEntry; index: number }) {
  const user = entry.userInfo;
  const name =
    user?.name || user?.username || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '已登录用户';
  const relativeTime = useMemo(() => formatRelativeTime(entry.createdAt), [entry.createdAt]);

  return (
    <li>
      <Avatar name={name} image={user?.imageUrl ?? null} fallbackIndex={index} />
      <div>
        <div className='guest-list__head'>
          <strong>{name}</strong>
          <time dateTime={entry.createdAt ?? undefined} title={entry.createdAt ?? undefined}>{relativeTime}</time>
        </div>
        <div className='guest-list__body comment__message'>
          <CommentMarkdown>{entry.message}</CommentMarkdown>
        </div>
      </div>
    </li>
  );
}

function Avatar({ name, image, fallbackIndex }: { name: string; image: string | null; fallbackIndex?: number }) {
  if (image) return <img src={image} alt='' loading='lazy' />;
  if (fallbackIndex !== undefined) {
    return <img src={`/avatars/avatar_${(fallbackIndex % 8) + 1}.png`} alt='' loading='lazy' />;
  }
  return <span className='guest-avatar' aria-hidden='true'>{name.trim().charAt(0).toUpperCase() || '?'}</span>;
}

function GuestbookSkeleton() {
  return (
    <ul className='guest-list' role='status' aria-label='留言加载中'>
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} aria-hidden='true'>
          <span className='guest-avatar' />
          <div>
            <span className='skeleton-line skeleton-line--meta' style={{ marginTop: 4 }} />
            <span className='skeleton-line skeleton-line--text' />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelativeTime(value: string | null) {
  if (!value) return '刚刚';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} 天前`;
  if (seconds < 31104000) return `${Math.floor(seconds / 2592000)} 个月前`;
  return `${Math.floor(seconds / 31104000)} 年前`;
}
