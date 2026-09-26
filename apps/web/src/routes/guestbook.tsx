import { pageHead } from '../lib/seo';
import { loadPublicQuery } from '../lib/route-query';
import { authClient, useSession } from '@meme/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { publicGuestbookQueryOptions, usePublicGuestbook, type PublicGuestbookEntry } from '../lib/admin-queries';
import { useAuthedFetch } from '../lib/auth';
import { openAuthDialog } from '../lib/auth-dialog-store';
import { CommentMarkdown } from '../lib/comment-markdown';
import { EyeCloseIcon, EyeOpenIcon } from '../lib/comment-icons';
import { TiltedSendIcon } from '../lib/icons';
import { Skeleton } from '@bunship-ai/ui/components/skeleton';
import { AdBanner } from '../lib/adsense';

export const Route = createFileRoute('/guestbook')({
  head: () => pageHead('留言墙', '来 Koya 的博客交流技术、反馈文章或打个招呼。登录后即可留下留言。', '/guestbook'),
  loader: ({ context }) => loadPublicQuery(context.queryClient, publicGuestbookQueryOptions()), component: GuestbookPage });

function GuestbookPage() {
  const entries = usePublicGuestbook();
  return (
    <section className='legacy-container legacy-guestbook-page'>
      <header className='legacy-blog-header'><h1>留言墙</h1><p>随便写点什么，欢迎来打个招呼。</p></header>
      <div className='legacy-guestbook'>
        <GuestbookInput />
        {entries.isPending && <GuestbookSkeleton />}
        {entries.isError && <p className='state-text state-text--error'>{entries.error instanceof Error ? entries.error.message : String(entries.error)}</p>}
        {entries.data && entries.data.length === 0 && <p className='state-text'>还没有导入留言。</p>}
        {entries.data && entries.data.length > 0 && <GuestbookFeed messages={entries.data} />}
      </div>
      {!!entries.data?.length && <AdBanner placement='guestbook' />}
    </section>
  );
}

function GuestbookInput() {
  const { data, isPending } = useSession();
  const me = data?.user;
  const queryClient = useQueryClient();
  const authedFetch = useAuthedFetch();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const needsName = !!me && !me.name?.trim();
  const [message, setMessage] = useState('');
  const [isPreviewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const trimmed = message.trim();
  const isActive = trimmed.length > 0;
  const isOverLimit = message.length > 600;
  async function send() {
    if (!isActive || sending || isOverLimit) return;
    if (needsName && !name.trim()) { setError('先填写一个公开昵称，再发送留言。'); return; }
    setSending(true);
    setError(null);
    try {
      if (needsName) {
        const updated = await authClient.updateUser({ name: name.trim() });
        if (updated.error) throw new Error(updated.error.message || '昵称保存失败，请重试。');
      }
      const res = await authedFetch('/api/guestbook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: trimmed }) });
      if (!res.ok) throw new Error('留言发送失败，请重试。');
      setMessage(''); setPreviewing(false);
      await queryClient.invalidateQueries({ queryKey: ['public', 'guestbook'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '留言发送失败，请重试。');
    } finally { setSending(false); }
  }
  if (isPending) {
    return <div className='legacy-guestbook-input' role='status' aria-label='留言表单加载中'>
      <Skeleton className='size-10 shrink-0 rounded-full' />
      <div className='legacy-guestbook-input__body'><Skeleton className='h-20 w-full' /></div>
    </div>;
  }
  if (!me) {
    return (
      <div className='legacy-guestbook-input'>
        <div className='legacy-guestbook-input__grid' aria-hidden='true' />
        <img src='/avatars/avatar_1.png' alt='' />
        <div className='legacy-guestbook-input__body legacy-guestbook-signin'><span>登录后即可留言。</span><button type='button' className='admin-button' onClick={() => openAuthDialog('signin')}>去登录</button></div>
      </div>
    );
  }
  return (
    <div className={`legacy-guestbook-input${sending ? ' is-pending' : ''}`}>
      <div className='legacy-guestbook-input__grid' aria-hidden='true' />
      <img src={me?.image ?? '/avatars/avatar_1.png'} alt='' />
      <div className='legacy-guestbook-input__body'>
        {needsName && <label className='guestbook-nickname'>公开昵称<input value={name} maxLength={40} onChange={event => setName(event.target.value)} placeholder='留言时显示的名字' disabled={sending} autoComplete='nickname' /></label>}
        {isPreviewing ? (
          <div className='legacy-guestbook-preview comment__message'>
            <CommentMarkdown>{message}</CommentMarkdown>
          </div>
        ) : (
          <TextareaAutosize
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); void send(); } }}
            placeholder='说点什么吧，万一火不了呢...'
            minRows={2}
            maxRows={8}
            disabled={sending}
          />
        )}
        <footer>
          <span className={isActive ? 'visible' : ''}>支持 <strong>Markdown</strong> 与 <strong>GFM</strong></span>
          <div className={isActive ? 'visible' : ''}>
            <span className={isOverLimit ? 'is-danger' : undefined}>{message.length}/600</span>
            <button type='button' aria-label={isPreviewing ? '关闭预览' : '预览'} disabled={sending || !isActive} onClick={() => setPreviewing((value) => !value)}>
              {isPreviewing ? <EyeCloseIcon aria-hidden='true' /> : <EyeOpenIcon aria-hidden='true' />}
            </button>
            <button type='button' aria-label='发送' disabled={sending || !isActive || isOverLimit} onClick={() => void send()}>
              <TiltedSendIcon aria-hidden='true' />
            </button>
          </div>
        </footer>
        {error && <p className='state-text state-text--error' role='alert'>{error}</p>}
      </div>
    </div>
  );
}

function GuestbookFeed({ messages }: { messages: PublicGuestbookEntry[] }) {
  return (<div className='legacy-guestbook-feed'><ul>{messages.map((m, idx) => (<MessageItem key={m.id} message={m} idx={idx} length={messages.length} />))}</ul></div>);
}

function MessageItem({ message, idx, length }: { message: PublicGuestbookEntry; idx: number; length: number }) {
  const u = message.userInfo;
  const name = u?.name || u?.username || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '已登录用户';
  const avatar = u?.imageUrl ?? `/avatars/avatar_${(idx % 8) + 1}.png`;
  const relativeTime = useMemo(() => formatRelativeTime(message.createdAt), [message.createdAt]);
  return (
    <li className='legacy-message'>
      {idx !== length - 1 && <span className='legacy-message__line' />}
      <div className='legacy-message__header'><img src={avatar} alt='' loading='lazy' /><div><strong>{name}</strong><time dateTime={message.createdAt ?? undefined}>{relativeTime}</time></div></div>
      <div className='legacy-message__body comment__message'><CommentMarkdown>{message.message}</CommentMarkdown></div>
    </li>
  );
}

function GuestbookSkeleton() {
  return (<div className='legacy-guestbook-feed' role='status' aria-label='留言加载中'><ul>{Array.from({ length: 3 }).map((_, i) => (<li className='legacy-message loading' key={i}><div className='legacy-message__header'><span className='avatar-placeholder' /><div><span className='line-placeholder short' /><span className='line-placeholder' /></div></div></li>))}</ul></div>);
}

function formatRelativeTime(value: string | null) {
  if (!value) return '刚刚';
  const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 2592000) return `${Math.floor(s / 86400)} 天前`;
  if (s < 31104000) return `${Math.floor(s / 2592000)} 个月前`;
  return `${Math.floor(s / 31104000)} 年前`;
}
