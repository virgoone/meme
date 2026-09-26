import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Monitor,
  Send,
  Smartphone,
  X,
} from 'lucide-react';
import {
  newsletterTemplates,
  renderNewsletter,
  type DigestPost,
  type NewsletterCampaign,
  type NewsletterDraft,
} from '@meme/shared';
import { AdminPage, AdminPageHeader } from './admin-ui';
import { newsletterRequest, type NewsletterOptions } from './newsletter-client';
import type { BlogPost } from './admin-queries';
import './newsletter-composer.css';

const toDigest = (post: BlogPost): DigestPost => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  description: post.description ?? '',
  coverImageUrl: post.coverImageUrl,
  publishedAt: post.publishedAt,
});

export function NewsletterComposer({
  posts,
  options,
  saved,
}: {
  posts: BlogPost[];
  options: NewsletterOptions;
  saved?: NewsletterCampaign;
}) {
  const published = posts.filter(
    (post) =>
      post.publishedAt && new Date(post.publishedAt).getTime() <= Date.now(),
  );
  const [id] = useState(() => saved?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<NewsletterDraft>(
    () =>
      saved?.draft ?? {
        version: 1,
        subject: 'Koya 的博客 · 最近更新',
        headline: '最近写了这些，与你分享。',
        introduction:
          '你好，最近又整理了一些项目实践和技术笔记。挑了几篇放在这里，希望有一篇正好对你有用。',
        template: 'digest',
        includeDescriptions: true,
        posts: published.slice(0, 3).map(toDigest),
      },
  );
  const [campaign, setCampaign] = useState(saved);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | 'send' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(!saved);
  const mounted = useRef(true);
  const operation = useRef(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty && busy !== 'send') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const locked = campaign?.status === 'sending' || campaign?.status === 'sent';
  const valid =
    draft.posts.length > 0 &&
    Boolean(draft.subject.trim() && draft.headline.trim()) &&
    draft.posts.every((post) => post.title.trim());
  const preview = renderNewsletter(draft, { siteUrl: options.siteUrl });
  const edit = (patch: Partial<NewsletterDraft>) => {
    setDraft((value) => ({ ...value, ...patch }));
    setDirty(true);
    setConfirm(false);
    setNotice('');
    setError('');
  };
  const editPost = (id: string, patch: Partial<DigestPost>) =>
    edit({
      posts: draft.posts.map((post) =>
        post.id === id ? { ...post, ...patch } : post,
      ),
    });
  const movePost = (index: number, delta: number) => {
    const ordered = [...draft.posts];
    [ordered[index], ordered[index + delta]] = [
      ordered[index + delta],
      ordered[index],
    ];
    edit({ posts: ordered });
  };
  const save = async () => {
    if (locked) return campaign;
    const result = await newsletterRequest<NewsletterCampaign>(
      `/campaign/${id}`,
      'PUT',
      {
        ...draft,
        posts: draft.posts.map(({ id, title, description }) => ({
          id,
          title,
          description,
        })),
      },
    );
    setCampaign(result);
    setDraft(result.draft);
    setDirty(false);
    await queryClient.invalidateQueries({ queryKey: ['admin', 'newsletters'] });
    return result;
  };
  async function run(action: 'save' | 'test' | 'send') {
    if (operation.current) return;
    operation.current = true;
    setBusy(action);
    setError('');
    setNotice('');
    try {
      const current = await save();
      if (!current) return;
      if (action === 'save')
        setNotice('草稿已保存，可从「邮件记录」继续编辑。');
      if (action === 'test') {
        const result = await newsletterRequest<{ message: string }>(
          `/campaign/${id}/test`,
          'POST',
          { attemptId: crypto.randomUUID() },
        );
        setNotice(result.message);
      }
      if (action === 'send') {
        let progress = current;
        do {
          progress = await newsletterRequest<NewsletterCampaign>(
            `/campaign/${id}/send`,
            'POST',
            { recipientCount: options.recipients },
          );
          if (!mounted.current) break;
          setCampaign(progress);
          if (progress.status !== 'sent')
            await new Promise((resolve) => setTimeout(resolve, 700));
        } while (mounted.current && progress.status !== 'sent');
        setConfirm(false);
        if (progress.status === 'sent')
          setNotice(
            `发送完成：${progress.accepted} 封已提交邮件服务${progress.skipped ? `，${progress.skipped} 位已退订或变更邮箱的用户已跳过` : ''}。`,
          );
        await queryClient.invalidateQueries({
          queryKey: ['admin', 'newsletters'],
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请重试');
      if (action === 'send') {
        const latest = await newsletterRequest<NewsletterCampaign>(
          `/campaign/${id}`,
        ).catch(() => undefined);
        if (latest) setCampaign(latest);
      }
    } finally {
      operation.current = false;
      setBusy(null);
    }
  }
  return (
    <AdminPage className='newsletter-page'>
      <AdminPageHeader
        title='发送最近更新'
        description='把新文章整理成一封值得打开的邮件。'
        action={
          <Link to='/admin/newsletters' className='admin-button secondary'>
            邮件记录
          </Link>
        }
      />
      <div className='newsletter-audience'>
        <span>
          <Send size={16} />
          {campaign && campaign.status !== 'draft'
            ? `本次共 ${campaign.total} 位读者`
            : `${options.recipients} 位已确认订阅的读者`}
        </span>
        <small>自动排除待确认和已退订用户</small>
      </div>
      <div className='newsletter-workspace'>
        <div className='newsletter-editor'>
          <fieldset
            disabled={Boolean(busy) || locked}
            className='newsletter-fields'
          >
            <section className='digest-section'>
              <h2>邮件样式</h2>
              <div
                className='newsletter-templates'
                role='radiogroup'
                aria-label='邮件样式'
              >
                {newsletterTemplates.map((template) => (
                  <label
                    key={template.id}
                    className={`newsletter-template ${draft.template === template.id ? 'is-selected' : ''}`}
                  >
                    <input
                      type='radio'
                      name='newsletter-template'
                      value={template.id}
                      checked={draft.template === template.id}
                      onChange={() => edit({ template: template.id })}
                    />
                    <span
                      className={`newsletter-mini newsletter-mini--${template.id}`}
                      aria-hidden='true'
                    >
                      <i />
                      <b />
                      <em />
                      <b />
                      <em />
                    </span>
                    <strong>
                      {template.name}
                      {draft.template === template.id && <Check size={13} />}
                    </strong>
                    <small>{template.description}</small>
                  </label>
                ))}
              </div>
              <label className='newsletter-check'>
                <input
                  type='checkbox'
                  checked={draft.includeDescriptions}
                  onChange={(event) =>
                    edit({ includeDescriptions: event.target.checked })
                  }
                />
                显示文章摘要
              </label>
            </section>
            <section className='digest-section'>
              <h2>标题与开场白</h2>
              <label className='newsletter-field'>
                邮件主题
                <input
                  maxLength={160}
                  value={draft.subject}
                  onChange={(event) => edit({ subject: event.target.value })}
                />
                <small>显示在读者的收件箱中</small>
              </label>
              <fieldset
                className='newsletter-suggestions'
                aria-label='主题建议'
              >
                {[
                  'Koya 的博客 · 最近更新',
                  `这次更新了 ${draft.posts.length} 篇，与你分享`,
                  draft.posts[0]?.title,
                ]
                  .filter((s): s is string => Boolean(s))
                  .map((subject) => (
                    <button
                      type='button'
                      key={subject}
                      onClick={() => edit({ subject })}
                    >
                      {subject}
                    </button>
                  ))}
              </fieldset>
              <label className='newsletter-field'>
                邮件内标题
                <input
                  maxLength={100}
                  value={draft.headline}
                  onChange={(event) => edit({ headline: event.target.value })}
                />
              </label>
              <label className='newsletter-field'>
                开场白
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={draft.introduction}
                  onChange={(event) =>
                    edit({ introduction: event.target.value })
                  }
                />
              </label>
            </section>
            <section className='digest-section'>
              <div className='digest-section-title'>
                <h2>选择文章</h2>
                <span>已选 {draft.posts.length} / 10 篇</span>
              </div>
              <label className='newsletter-field'>
                <span className='sr-only'>搜索已发布文章</span>
                <input
                  type='search'
                  placeholder='搜索已发布文章…'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className='newsletter-post-picker'>
                {published
                  .filter((post) =>
                    post.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((post) => (
                    <label className='newsletter-post-option' key={post.id}>
                      <input
                        type='checkbox'
                        checked={draft.posts.some(
                          (selected) => selected.id === post.id,
                        )}
                        disabled={
                          !draft.posts.some(
                            (selected) => selected.id === post.id,
                          ) && draft.posts.length >= 10
                        }
                        onChange={(event) =>
                          edit({
                            posts: event.target.checked
                              ? [...draft.posts, toDigest(post)]
                              : draft.posts.filter(
                                  (selected) => selected.id !== post.id,
                                ),
                          })
                        }
                      />
                      <span>
                        {post.title}
                        <small>{post.publishedAt?.slice(0, 10)}</small>
                      </span>
                    </label>
                  ))}
                {!published.some((post) =>
                  post.title.toLowerCase().includes(search.toLowerCase()),
                ) && (
                  <p className='newsletter-muted'>
                    没有找到文章，试试其他关键词。
                  </p>
                )}
              </div>
            </section>
            <section className='digest-section'>
              <h2>本期内容</h2>
              <p className='newsletter-muted'>
                调整顺序或展开编辑，只影响这封邮件。
              </p>
              {draft.posts.map((post, index) => (
                <details className='newsletter-selected-post' key={post.id}>
                  <summary>
                    <span>{index + 1}</span>
                    <strong>{post.title}</strong>
                  </summary>
                  <div className='newsletter-post-edit'>
                    <label className='newsletter-field'>
                      文章标题
                      <input
                        maxLength={200}
                        value={post.title}
                        onChange={(event) =>
                          editPost(post.id, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className='newsletter-field'>
                      文章摘要
                      <textarea
                        rows={3}
                        maxLength={800}
                        value={post.description}
                        onChange={(event) =>
                          editPost(post.id, { description: event.target.value })
                        }
                      />
                    </label>
                    <div className='newsletter-post-actions'>
                      <button
                        type='button'
                        disabled={index === 0}
                        onClick={() => movePost(index, -1)}
                      >
                        <ArrowUp size={14} />
                        上移
                      </button>
                      <button
                        type='button'
                        disabled={index === draft.posts.length - 1}
                        onClick={() => movePost(index, 1)}
                      >
                        <ArrowDown size={14} />
                        下移
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          edit({
                            posts: draft.posts.filter((p) => p.id !== post.id),
                          })
                        }
                      >
                        <X size={14} />
                        移除
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </section>
          </fieldset>
        </div>
        <aside className='newsletter-preview'>
          <div className='newsletter-preview-toolbar'>
            <strong>邮件预览</strong>
            <fieldset aria-label='预览尺寸'>
              <button
                type='button'
                aria-label='桌面预览'
                aria-pressed={device === 'desktop'}
                onClick={() => setDevice('desktop')}
              >
                <Monitor size={16} />
              </button>
              <button
                type='button'
                aria-label='手机预览'
                aria-pressed={device === 'mobile'}
                onClick={() => setDevice('mobile')}
              >
                <Smartphone size={16} />
              </button>
            </fieldset>
          </div>
          <div className='newsletter-envelope'>
            <span>
              主题<strong>{draft.subject || '填写邮件主题'}</strong>
            </span>
            <span>
              发件人<strong>{options.from || '尚未配置发件地址'}</strong>
            </span>
          </div>
          <div
            className={`newsletter-preview-canvas ${device === 'mobile' ? 'is-mobile' : ''}`}
          >
            <iframe title='最近更新邮件预览' sandbox='' srcDoc={preview.html} />
          </div>
          <p className='newsletter-preview-note'>
            预览与发送使用相同排版；不同邮箱可能有细微差异。
          </p>
        </aside>
      </div>
      <section className='newsletter-send-panel'>
        {error && (
          <p className='admin-error' role='alert'>
            {error}
          </p>
        )}
        {notice && (
          <p className='newsletter-success' role='status'>
            <Check size={16} />
            {notice}
          </p>
        )}
        {!options.ready && (
          <p className='newsletter-muted'>
            邮件服务尚未配置，可以先编辑和保存草稿。
          </p>
        )}
        <div className='newsletter-send-bar'>
          <div>
            <strong>
              {campaign?.status === 'sent'
                ? '本期已发送'
                : busy === 'send'
                  ? '正在提交邮件…'
                  : locked
                    ? '本期已开始发送，内容已锁定'
                    : dirty
                      ? '编辑完成后，先发一封给自己看看'
                      : '草稿已保存'}
            </strong>
            <small>
              {locked
                ? `${campaign?.accepted ?? 0} 封已提交 · ${campaign?.remaining ?? 0} 封待处理`
                : `${draft.posts.length} 篇文章 · ${options.recipients} 位读者`}
            </small>
          </div>
          <div className='newsletter-send-actions'>
            {!locked && (
              <button
                type='button'
                className='admin-button secondary'
                disabled={Boolean(busy) || !valid}
                onClick={() => void run('save')}
              >
                {busy === 'save' ? '保存中…' : '保存草稿'}
              </button>
            )}
            <button
              type='button'
              className='admin-button secondary'
              disabled={Boolean(busy) || !valid || !options.ready}
              onClick={() => void run('test')}
            >
              {busy === 'test' ? '提交中…' : '发送测试给我'}
            </button>
            {campaign?.status !== 'sent' && (
              <button
                type='button'
                className='admin-button'
                disabled={
                  Boolean(busy) ||
                  !valid ||
                  !options.ready ||
                  (!options.recipients && !locked)
                }
                onClick={() => setConfirm(true)}
              >
                <Send size={14} />
                {busy === 'send'
                  ? '正在发送…'
                  : locked
                    ? '继续发送'
                    : '准备发送'}
              </button>
            )}
          </div>
        </div>
        {confirm && (
          <div className='newsletter-confirm'>
            <div>
              <strong>确认发送「{draft.subject}」？</strong>
              <p>
                {locked
                  ? `继续处理剩余 ${campaign?.remaining ?? 0} 位读者，已提交的邮件不会重复发送。`
                  : `将向 ${options.recipients} 位已确认订阅的读者发送 ${draft.posts.length} 篇文章。`}{' '}
                邮件提交后无法撤回。
              </p>
            </div>
            <div className='newsletter-send-actions'>
              <button
                type='button'
                className='admin-button secondary'
                disabled={Boolean(busy)}
                onClick={() => setConfirm(false)}
              >
                再检查一下
              </button>
              <button
                type='button'
                className='admin-button'
                disabled={Boolean(busy)}
                onClick={() => void run('send')}
              >
                确认发送{locked ? '' : `给 ${options.recipients} 位读者`}
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
